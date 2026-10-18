# 高阶算法模板验证记录

运行时间（UTC）：2026-10-18T07:04:10.611Z。生成命令：`node scripts/advanced-validate.mjs && node scripts/advanced-validation-doc.mjs`。

验证状态 **绑定** 到：展示源码的 SHA-256 + 测试集版本（`adv-tests-v1`）。源码或测试集任一改变，页面显示"验证过期"，而不是沿用旧结果。

## 工具链

| 工具 | 版本 |
|---|---|
| gpp | gcc (Debian 14.2.0-19) 14.2.0 |
| python | Python 3.13.5 |
| node | v24.20.0 |
| javac | javac 21.0.12.1 |
| java | openjdk version "21.0.12.1" 2026-08-18 |
| rustc | rustc 1.85.1 (4eb161250 2025-03-15) (built from a source tarball) |
| go | go version go1.27.2 linux/amd64 |

本次运行没有缺失的工具链。

> 说明：g++ 来自 Debian 的 gcc-14 软件包解压到 /workspace/adv/tools（本机无 sudo，通过 `apt-get download` + `dpkg -x` 安装，包装脚本补全 -B/-isystem 路径）；JDK 同样；这些不是系统默认安装，复现需要同样的包版本。

## 方法

- 被测对象就是页面展示（复制/导出）的源码：从生成的目录读取，重新计算 SHA-256 并与界面绑定的哈希比较。
- 向量：固定种子 PRNG（mulberry32）生成；独立朴素基线写在脚本里（标签数组并查集、O(n) 前缀和、线性扫描、无序列表取最大值），不调用被测代码。
- 每种语言的驱动导入/调用展示的函数，同一进程内跑全部用例。
- C++：`g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra`；任何警告都算失败。
- 竞赛版：核心代码按展示原样 `#include` 进驱动；含 main 的完整版按展示原样编译，先对样例输出做精确比较，再跑随机 stdin 与基线比较。
- 数值：Fenwick 含超 32 位的和（3e9×1000、±1e12 随机）。

## 结果

| 键（模板\|版本\|语言\|类型） | 结果 | 用例数 | 检查 | 源码 SHA-256 前 12 位 |
|---|---|---|---|---|
| `stl-bounds|teach|cpp|run` | 通过 | 500 | g++ -std=c++17 ASan+UBSan -Wall -Wextra clean | e695e94ca568 |
| `stl-bounds|contest-core|cpp|run` | 通过 | 500 | core compiled as displayed + driver; ASan+UBSan; naive baseline | c26c4d156845 |
| `stl-bounds|contest-full|cpp|run` | 通过 | 151 | full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan | 9c15378a47fe |
| `stl-priority-queue|teach|cpp|run` | 通过 | 400 | g++ -std=c++17 ASan+UBSan -Wall -Wextra clean | 424e184f1fde |
| `stl-priority-queue|contest-core|cpp|run` | 通过 | 400 | core compiled as displayed + driver; ASan+UBSan; naive baseline | 145f24b07a75 |
| `stl-priority-queue|contest-full|cpp|run` | 通过 | 151 | full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan | d159ba32bae4 |
| `dsu|teach|typescript|run` | 通过 | 402 | node strip-types (displayed .ts imported unchanged) | 55e11487607c |
| `dsu|teach|python|run` | 通过 | 402 | python3 -X dev | 2e7e194bd3b4 |
| `dsu|teach|cpp|run` | 通过 | 402 | g++ -std=c++17 ASan+UBSan -Wall -Wextra clean | 87b5f27060ba |
| `dsu|teach|java|run` | 通过 | 402 | javac -Xlint:all; java -ea | 1fdca34c1e6f |
| `dsu|teach|rust|run` | 通过 | 402 | rustc -D warnings, overflow-checks=on | 56864f576c03 |
| `dsu|teach|go|run` | 通过 | 402 | go vet; go run | a8dd9a703fde |
| `dsu|contest-core|cpp|run` | 通过 | 402 | core compiled as displayed + driver; ASan+UBSan; naive baseline | 96aad7e5b220 |
| `dsu|contest-full|cpp|run` | 通过 | 151 | full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan | 1682da15cd6d |
| `fenwick|teach|typescript|run` | 通过 | 401 | node strip-types (displayed .ts imported unchanged) | bd9f540711dc |
| `fenwick|teach|python|run` | 通过 | 401 | python3 -X dev | f73c52c16b1b |
| `fenwick|teach|cpp|run` | 通过 | 401 | g++ -std=c++17 ASan+UBSan -Wall -Wextra clean | a86daa625a0e |
| `fenwick|teach|java|run` | 通过 | 401 | javac -Xlint:all; java -ea | 36c1881bc1e9 |
| `fenwick|teach|rust|run` | 通过 | 401 | rustc -D warnings, overflow-checks=on | 91976e22c108 |
| `fenwick|teach|go|run` | 通过 | 401 | go vet; go run | 798f3d8683e4 |
| `fenwick|contest-core|cpp|run` | 通过 | 401 | core compiled as displayed + driver; ASan+UBSan; naive baseline | fbc511e25836 |
| `fenwick|contest-full|cpp|run` | 通过 | 151 | full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan | da994cf41201 |
| `segtree|teach|typescript|run` | 通过 | 401 | node strip-types (displayed .ts imported unchanged) | 112b7b6fd84d |
| `segtree|teach|python|run` | 通过 | 401 | python3 -X dev | 385c2ac3dde0 |
| `segtree|teach|cpp|run` | 通过 | 401 | g++ -std=c++17 ASan+UBSan -Wall -Wextra clean | 558bc5e29c6d |
| `segtree|teach|java|run` | 通过 | 401 | javac -Xlint:all; java -ea | 7f71e5496473 |
| `segtree|teach|rust|run` | 通过 | 401 | rustc -D warnings, overflow-checks=on | 8c995f20c942 |
| `segtree|teach|go|run` | 通过 | 401 | go vet; go run | 9b66a3e7e37f |
| `segtree|contest-core|cpp|run` | 通过 | 401 | core compiled as displayed + driver; ASan+UBSan; naive baseline | 9beceb2a4c16 |
| `segtree|contest-full|cpp|run` | 通过 | 151 | full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan | 6452fc34bcca |
| `segtree-lazy|teach|typescript|run` | 通过 | 401 | node strip-types (displayed .ts imported unchanged) | 3eeb4aee02f3 |
| `segtree-lazy|teach|python|run` | 通过 | 401 | python3 -X dev | 4be97b2c9f2c |
| `segtree-lazy|teach|cpp|run` | 通过 | 401 | g++ -std=c++17 ASan+UBSan -Wall -Wextra clean | 6e626d7f8f9f |
| `segtree-lazy|teach|java|run` | 通过 | 401 | javac -Xlint:all; java -ea | 767aea4c157f |
| `segtree-lazy|teach|rust|run` | 通过 | 401 | rustc -D warnings, overflow-checks=on | eb130a0fffb6 |
| `segtree-lazy|teach|go|run` | 通过 | 401 | go vet; go run | a0c5930ca22b |
| `segtree-lazy|contest-core|cpp|run` | 通过 | 401 | core compiled as displayed + driver; ASan+UBSan; naive baseline | 778ed3d91d20 |
| `segtree-lazy|contest-full|cpp|run` | 通过 | 151 | full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan | e01f685f33e4 |
| `prefix-diff|teach|typescript|run` | 通过 | 400 | node strip-types (displayed .ts imported unchanged) | f2cdbf354633 |
| `prefix-diff|teach|python|run` | 通过 | 400 | python3 -X dev | 65a20297c4e2 |
| `prefix-diff|teach|cpp|run` | 通过 | 400 | g++ -std=c++17 ASan+UBSan -Wall -Wextra clean | fb5a5e1b848c |
| `prefix-diff|teach|java|run` | 通过 | 400 | javac -Xlint:all; java -ea | ea786fbbb874 |
| `prefix-diff|teach|rust|run` | 通过 | 400 | rustc -D warnings, overflow-checks=on | d047053f76a7 |
| `prefix-diff|teach|go|run` | 通过 | 400 | go vet; go run | c79eedf13a58 |
| `prefix-diff|contest-core|cpp|run` | 通过 | 400 | core compiled as displayed + driver; ASan+UBSan; naive baseline | 2efe1fa60c7c |
| `prefix-diff|contest-full|cpp|run` | 通过 | 151 | full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan | c689b9e15780 |
| `discretize|teach|typescript|run` | 通过 | 400 | node strip-types (displayed .ts imported unchanged) | f67d8ead9dcb |
| `discretize|teach|python|run` | 通过 | 400 | python3 -X dev | f035ad714811 |
| `discretize|teach|cpp|run` | 通过 | 400 | g++ -std=c++17 ASan+UBSan -Wall -Wextra clean | fe918de84360 |
| `discretize|teach|java|run` | 通过 | 400 | javac -Xlint:all; java -ea | 6fb7aa72904b |
| `discretize|teach|rust|run` | 通过 | 400 | rustc -D warnings, overflow-checks=on | 64859f33d24f |
| `discretize|teach|go|run` | 通过 | 400 | go vet; go run | 6a7ed2491a75 |
| `discretize|contest-core|cpp|run` | 通过 | 400 | core compiled as displayed + driver; ASan+UBSan; naive baseline | e1d583681ce2 |
| `discretize|contest-full|cpp|run` | 通过 | 151 | full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan | 43b6e70c5c24 |
| `bs-answer|teach|typescript|run` | 通过 | 400 | node strip-types (displayed .ts imported unchanged) | 92d99e81d908 |
| `bs-answer|teach|python|run` | 通过 | 400 | python3 -X dev | 98b2c9305446 |
| `bs-answer|teach|cpp|run` | 通过 | 400 | g++ -std=c++17 ASan+UBSan -Wall -Wextra clean | dd1ce98cb353 |
| `bs-answer|teach|java|run` | 通过 | 400 | javac -Xlint:all; java -ea | f04f76f6634e |
| `bs-answer|teach|rust|run` | 通过 | 400 | rustc -D warnings, overflow-checks=on | 82ed264db03c |
| `bs-answer|teach|go|run` | 通过 | 400 | go vet; go run | f1800f1cdbf1 |
| `bs-answer|contest-core|cpp|run` | 通过 | 400 | core compiled as displayed + driver; ASan+UBSan; naive baseline | d0395009ff35 |
| `bs-answer|contest-full|cpp|run` | 通过 | 151 | full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan | 136cc73325da |
| `mono-stack|teach|typescript|run` | 通过 | 400 | node strip-types (displayed .ts imported unchanged) | f5df684baed0 |
| `mono-stack|teach|python|run` | 通过 | 400 | python3 -X dev | e82551f8d693 |
| `mono-stack|teach|cpp|run` | 通过 | 400 | g++ -std=c++17 ASan+UBSan -Wall -Wextra clean | 0239cc48b4e8 |
| `mono-stack|teach|java|run` | 通过 | 400 | javac -Xlint:all; java -ea | 45eca5c9eacd |
| `mono-stack|teach|rust|run` | 通过 | 400 | rustc -D warnings, overflow-checks=on | e78f102d98e5 |
| `mono-stack|teach|go|run` | 通过 | 400 | go vet; go run | 55e12d463a27 |
| `mono-stack|contest-core|cpp|run` | 通过 | 400 | core compiled as displayed + driver; ASan+UBSan; naive baseline | 0f97b0e7a15e |
| `mono-stack|contest-full|cpp|run` | 通过 | 151 | full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan | 4ea5ce3c9373 |
| `mono-queue|teach|typescript|run` | 通过 | 400 | node strip-types (displayed .ts imported unchanged) | 490138ac51e5 |
| `mono-queue|teach|python|run` | 通过 | 400 | python3 -X dev | 11e6c4820aae |
| `mono-queue|teach|cpp|run` | 通过 | 400 | g++ -std=c++17 ASan+UBSan -Wall -Wextra clean | d5e9a1d26f90 |
| `mono-queue|teach|java|run` | 通过 | 400 | javac -Xlint:all; java -ea | 506f45164cf7 |
| `mono-queue|teach|rust|run` | 通过 | 400 | rustc -D warnings, overflow-checks=on | c7971a237904 |
| `mono-queue|teach|go|run` | 通过 | 400 | go vet; go run | fd989c2d937c |
| `mono-queue|contest-core|cpp|run` | 通过 | 400 | core compiled as displayed + driver; ASan+UBSan; naive baseline | fc3c4094c5f2 |
| `mono-queue|contest-full|cpp|run` | 通过 | 151 | full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan | 005f35400c16 |
| `topo|teach|typescript|run` | 通过 | 400 | node strip-types (displayed .ts imported unchanged) | 6a2b2f849296 |
| `topo|teach|python|run` | 通过 | 400 | python3 -X dev | 5d27e5d3924c |
| `topo|teach|cpp|run` | 通过 | 400 | g++ -std=c++17 ASan+UBSan -Wall -Wextra clean | a39167fdcf2b |
| `topo|teach|java|run` | 通过 | 400 | javac -Xlint:all; java -ea | caa955f6a484 |
| `topo|teach|rust|run` | 通过 | 400 | rustc -D warnings, overflow-checks=on | 519096798f25 |
| `topo|teach|go|run` | 通过 | 400 | go vet; go run | 2b0014f5c3d1 |
| `topo|contest-core|cpp|run` | 通过 | 400 | core compiled as displayed + driver; ASan+UBSan; naive baseline | 1da1c3b9b8ff |
| `topo|contest-full|cpp|run` | 通过 | 151 | full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan | b2b9dfb3c568 |
| `lca|teach|typescript|run` | 通过 | 300 | node strip-types (displayed .ts imported unchanged) | 508332f72b88 |
| `lca|teach|python|run` | 通过 | 300 | python3 -X dev | b7b996ae3228 |
| `lca|teach|cpp|run` | 通过 | 300 | g++ -std=c++17 ASan+UBSan -Wall -Wextra clean | d64428b5413c |
| `lca|teach|java|run` | 通过 | 300 | javac -Xlint:all; java -ea | a465d70dd3b2 |
| `lca|teach|rust|run` | 通过 | 300 | rustc -D warnings, overflow-checks=on | 6003cabd9208 |
| `lca|teach|go|run` | 通过 | 300 | go vet; go run | adf1e6e9ae71 |
| `lca|contest-core|cpp|run` | 通过 | 300 | core compiled as displayed + driver; ASan+UBSan; naive baseline | 5b3a05211999 |
| `lca|contest-full|cpp|run` | 通过 | 151 | full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan | 5e442b2fc46f |
| `lis|teach|typescript|run` | 通过 | 400 | node strip-types (displayed .ts imported unchanged) | cacad263356d |
| `lis|teach|python|run` | 通过 | 400 | python3 -X dev | 22cf46b46658 |
| `lis|teach|cpp|run` | 通过 | 400 | g++ -std=c++17 ASan+UBSan -Wall -Wextra clean | dc72b49fe10b |
| `lis|teach|java|run` | 通过 | 400 | javac -Xlint:all; java -ea | b6ef26232fe6 |
| `lis|teach|rust|run` | 通过 | 400 | rustc -D warnings, overflow-checks=on | 96e1b87d041f |
| `lis|teach|go|run` | 通过 | 400 | go vet; go run | 9ef9984ddd11 |
| `lis|contest-core|cpp|run` | 通过 | 400 | core compiled as displayed + driver; ASan+UBSan; naive baseline | f6035cf2f23d |
| `lis|contest-full|cpp|run` | 通过 | 151 | full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan | c60b5675359b |
| `number-theory|teach|typescript|run` | 通过 | 300 | node strip-types (displayed .ts imported unchanged) | 7ba5dc9f9416 |
| `number-theory|teach|python|run` | 通过 | 300 | python3 -X dev | d764f91040dd |
| `number-theory|teach|cpp|run` | 通过 | 300 | g++ -std=c++17 ASan+UBSan -Wall -Wextra clean | 7dd7117428ff |
| `number-theory|teach|java|run` | 通过 | 300 | javac -Xlint:all; java -ea | 7cbcc28e1535 |
| `number-theory|teach|rust|run` | 通过 | 300 | rustc -D warnings, overflow-checks=on | e3bcf0991f8b |
| `number-theory|teach|go|run` | 通过 | 300 | go vet; go run | 6489201d1285 |
| `number-theory|contest-core|cpp|run` | 通过 | 300 | core compiled as displayed + driver; ASan+UBSan; naive baseline | 2c5eb5a73edf |
| `number-theory|contest-full|cpp|run` | 通过 | 151 | full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan | d8f6ced0cd54 |

## 命令与退出码

### stl-bounds|teach|cpp|run

- `g++ --version` → exit 0 (5 ms)
- `python3 --version` → exit 0 (2 ms)
- `node --version` → exit 0 (5 ms)
- `javac -version` → exit 0 (109 ms)
- `java -version` → exit 0 (43 ms)
- `rustc --version` → exit 0 (28 ms)
- `go version` → exit 0 (4 ms)
- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (287 ms)
- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (263 ms)
- `./main` → exit 0 (10 ms)

### stl-bounds|contest-core|cpp|run

- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (280 ms)
- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (272 ms)
- `./main` → exit 0 (12 ms)

### stl-bounds|contest-full|cpp|run

- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra full.cpp -o full` → exit 0 (261 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)

### stl-priority-queue|teach|cpp|run

- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (279 ms)
- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (273 ms)
- `./main` → exit 0 (12 ms)

### stl-priority-queue|contest-core|cpp|run

- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (572 ms)
- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (560 ms)
- `./main` → exit 0 (14 ms)

### stl-priority-queue|contest-full|cpp|run

- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra full.cpp -o full` → exit 0 (460 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)

### dsu|teach|typescript|run

- `node --experimental-strip-types --no-warnings main.ts` → exit 0 (73 ms)

### dsu|teach|python|run

- `python3 -X dev main.py` → exit 0 (30 ms)

### dsu|teach|cpp|run

- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (484 ms)
- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (451 ms)
- `./main` → exit 0 (13 ms)

### dsu|teach|java|run

- `javac -Xlint:all DSU.java Main.java` → exit 0 (389 ms)
- `java -ea -cp $TMP Main` → exit 0 (65 ms)

### dsu|teach|rust|run

- `rustc --edition 2021 -C debuginfo=0 -C overflow-checks=on -D warnings main.rs -o main` → exit 0 (263 ms)
- `./main` → exit 0 (10 ms)

### dsu|teach|go|run

- `go vet ./...` → exit 0 (2871 ms)
- `go run .` → exit 0 (120 ms)

### dsu|contest-core|cpp|run

- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (506 ms)
- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (492 ms)
- `./main` → exit 0 (13 ms)

### dsu|contest-full|cpp|run

- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra full.cpp -o full` → exit 0 (253 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)

### fenwick|teach|typescript|run

- `node --experimental-strip-types --no-warnings main.ts` → exit 0 (76 ms)

### fenwick|teach|python|run

- `python3 -X dev main.py` → exit 0 (32 ms)

### fenwick|teach|cpp|run

- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (203 ms)
- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (202 ms)
- `./main` → exit 0 (10 ms)

### fenwick|teach|java|run

- `javac -Xlint:all Fenwick.java Main.java` → exit 0 (360 ms)
- `java -ea -cp $TMP Main` → exit 0 (75 ms)

### fenwick|teach|rust|run

- `rustc --edition 2021 -C debuginfo=0 -C overflow-checks=on -D warnings main.rs -o main` → exit 0 (214 ms)
- `./main` → exit 0 (11 ms)

### fenwick|teach|go|run

- `go vet ./...` → exit 0 (2901 ms)
- `go run .` → exit 0 (123 ms)

### fenwick|contest-core|cpp|run

- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (208 ms)
- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (208 ms)
- `./main` → exit 0 (12 ms)

### fenwick|contest-full|cpp|run

- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra full.cpp -o full` → exit 0 (200 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)

### segtree|teach|typescript|run

- `node --experimental-strip-types --no-warnings main.ts` → exit 0 (83 ms)

### segtree|teach|python|run

- `python3 -X dev main.py` → exit 0 (51 ms)

### segtree|teach|cpp|run

- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (695 ms)
- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (676 ms)
- `./main` → exit 0 (14 ms)

### segtree|teach|java|run

- `javac -Xlint:all SegTree.java Main.java` → exit 0 (441 ms)
- `java -ea -cp $TMP Main` → exit 0 (67 ms)

### segtree|teach|rust|run

- `rustc --edition 2021 -C debuginfo=0 -C overflow-checks=on -D warnings main.rs -o main` → exit 0 (227 ms)
- `./main` → exit 0 (16 ms)

### segtree|teach|go|run

- `go vet ./...` → exit 0 (2812 ms)
- `go run .` → exit 0 (122 ms)

### segtree|contest-core|cpp|run

- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (220 ms)
- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra main.cpp -o main` → exit 0 (226 ms)
- `./main` → exit 0 (12 ms)

### segtree|contest-full|cpp|run

- `g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra full.cpp -o full` → exit 0 (212 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (5 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (3 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)
- `./full` → exit 0 (4 ms)

## 负控制（让验证器真的失败一次）

把 `fenwick.go` 的 `p -= p & -p` 改成 `p -= 1`，重新生成目录与哈希后运行 `--only=fenwick`：Go 条目失败（`fenwick case 1: got [...-1392...] want [...-791...]`），其余语言通过；恢复后 22 项全部通过。日志：`/workspace/adv/logs/negctl-validator-fenwick-go.log`。

## 未验证 / 不适用

- 本验证不覆盖 Safari / WebKit / Firefox / 真机 / 读屏器。
- STL 实验的"操作模型"不是 C++ 编译器，也不执行用户编辑的源码；教学版 C++ 的执行映射由 vitest 对照 trace 验证，不由这里验证。
- 竞赛版与教学版控制流不同构，竞赛版没有"正在执行"箭头（仅参考）。
