import sys
from algo import huffman
lines = sys.stdin.read().split("\n")
sym = lines[0].split()
fr = [int(x) for x in lines[1].split()]
root = huffman(sym, fr)
codes: dict[str, str] = {}


def walk(n, p: str, d: int) -> int:
    if n.left is None and n.right is None:
        codes[n.ch] = p
        return n.freq * d
    return walk(n.left, p + "0", d + 1) + walk(n.right, p + "1", d + 1)


wpl = walk(root, "", 0) if root else 0
print(wpl)
if lines[2].strip() == "codes":
    print(" ".join(f"{k}={codes[k]}" for k in sorted(codes)))
