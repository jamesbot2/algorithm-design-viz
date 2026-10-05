/**
 * V28: prove the Python / C++ / Java / Rust / Go reference documents are REAL code that computes
 * what the app's own solver computes. Compiles the DISPLAYED source of every document (markers
 * already stripped, exactly what the code panel shows) together with a small stdin/stdout
 * harness (scripts/lang-harness/<algo>/main.*), runs a case list, and compares the output with
 * the final result of the app's trace generator (src/algorithms/*).
 *
 * Usage: npx tsx scripts/check-code-langs.ts [algo...]   (needs python3, g++, javac/java, rustc, go)
 * Exit code 1 on any mismatch or build failure. Not part of CI (toolchains are not installed there).
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { algoDirs, buildDocs } from './gen-code-langs.mjs'
import { CASES } from './lang-cases'

const HARNESS = join(process.cwd(), 'scripts', 'lang-harness')

function sh(cmd: string, args: string[], cwd: string, input?: string): string {
  return execFileSync(cmd, args, { cwd, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120_000 })
}

type Built = { run: (stdin: string) => string }

function build(lang: string, source: string, harnessDir: string, javaClass: string): Built {
  const dir = mkdtempSync(join(tmpdir(), `v28-${lang}-`))
  switch (lang) {
    case 'python':
      writeFileSync(join(dir, 'algo.py'), source)
      copyFileSync(join(harnessDir, 'main.py'), join(dir, 'main.py'))
      return { run: (i) => sh('python3', ['main.py'], dir, i) }
    case 'cpp':
      writeFileSync(join(dir, 'algo.cpp'), source)
      copyFileSync(join(harnessDir, 'main.cpp'), join(dir, 'main.cpp'))
      sh('g++', ['-std=c++17', '-O1', '-Wall', '-Wextra', '-Werror', '-Wno-sign-compare', 'main.cpp', '-o', 'main'], dir)
      return { run: (i) => sh('./main', [], dir, i) }
    case 'java':
      writeFileSync(join(dir, `${javaClass}.java`), source)
      copyFileSync(join(harnessDir, 'Main.java'), join(dir, 'Main.java'))
      sh('javac', ['-Xlint:all', '-Werror', `${javaClass}.java`, 'Main.java'], dir)
      return { run: (i) => sh('java', ['-cp', '.', 'Main'], dir, i) }
    case 'rust':
      writeFileSync(join(dir, 'algo.rs'), source)
      copyFileSync(join(harnessDir, 'main.rs'), join(dir, 'main.rs'))
      sh('rustc', ['--edition', '2021', '-O', '-D', 'warnings', '-A', 'clippy::all', 'main.rs', '-o', 'main'], dir)
      return { run: (i) => sh('./main', [], dir, i) }
    case 'go': {
      if (!/^package algorithms$/m.test(source)) throw new Error('go document must declare package algorithms')
      writeFileSync(join(dir, 'algo.go'), source.replace(/^package algorithms$/m, 'package main'))
      copyFileSync(join(harnessDir, 'main.go'), join(dir, 'main.go'))
      writeFileSync(join(dir, 'go.mod'), 'module harness\n\ngo 1.22\n')
      sh('go', ['vet', '.'], dir)
      sh('go', ['build', '-o', 'main', '.'], dir)
      return { run: (i) => sh('./main', [], dir, i) }
    }
  }
  throw new Error(`no builder for ${lang}`)
}

const want = process.argv.slice(2)
const algos = (algoDirs() as string[]).filter((d) => existsSync(join(HARNESS, d)) && (!want.length || want.includes(d)))
let fails = 0
let checks = 0
for (const dirName of algos) {
  const built = buildDocs(dirName) as { docs: { language: string; documentId: string; source: string; sourceFile: string }[] }
  const mk = CASES[dirName]
  if (!mk) throw new Error(`no case list for ${dirName} in scripts/lang-cases.ts`)
  const cases = mk()
  for (const doc of built.docs) {
    const javaClass = doc.sourceFile.split('/').pop()!.replace(/\.java$/, '')
    let b: Built
    try {
      b = build(doc.language, doc.source, join(HARNESS, dirName), javaClass)
    } catch (e) {
      const err = e as { stderr?: string; message: string }
      console.log(`FAIL build ${doc.documentId}: ${(err.stderr || err.message).slice(0, 2000)}`)
      fails++
      continue
    }
    let ok = 0
    for (const c of cases) {
      checks++
      const got = b.run(c.stdin).replace(/\s+$/, '').split('\n').map((l) => l.trimEnd()).join('\n')
      if (got === c.expected) ok++
      else {
        fails++
        console.log(`FAIL ${doc.documentId} ${c.name}\n  expected: ${JSON.stringify(c.expected)}\n  got:      ${JSON.stringify(got)}`)
      }
    }
    console.log(`${ok === cases.length ? 'ok  ' : 'FAIL'} ${doc.documentId.padEnd(12)} ${ok}/${cases.length} cases match the app solver`)
  }
}
console.log(`\n${checks} checks, ${fails} failure(s)`)
process.exit(fails ? 1 : 0)
