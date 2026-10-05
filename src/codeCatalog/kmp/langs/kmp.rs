/// KMP string matching — complete Rust reference.
pub fn kmp_search(text: &str, pattern: &str) -> Vec<usize> {
    let (t, p): (Vec<char>, Vec<char>) = (text.chars().collect(), pattern.chars().collect());
    let mut hits: Vec<usize> = Vec::new();
    if p.is_empty() { // @a: emptyPattern+1
        return vec![0];
    }
    let lps = build_lps(&p); // @a: buildLps
    let mut i = 0;
    let mut j = 0;
    while i < t.len() {
        if t[i] == p[j] { // @a: match
            i += 1;
            j += 1;
            if j == p.len() {
                hits.push(i - j); // @a: hit
                j = lps[j - 1];
            }
        } else if j > 0 { // @a: fallback
            j = lps[j - 1]; // @a: fallbackWrite
        } else {
            i += 1; // @a: advance
        }
    }
    hits // @a: done, return
}

fn build_lps(p: &[char]) -> Vec<usize> {
    let mut lps = vec![0; p.len()];
    let mut len = 0;
    let mut i = 1;
    while i < p.len() {
        if p[i] == p[len] { // @a: lpsCompare
            len += 1; // @a: lpsExtend+1
            lps[i] = len;
            i += 1;
        } else if len > 0 { // @a: lpsFallbackCond
            len = lps[len - 1]; // @a: lpsFallback
        } else {
            lps[i] = 0; // @a: lpsZero+1
            i += 1;
        }
    }
    lps // @a: lpsReturn
}
