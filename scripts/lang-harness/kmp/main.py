import sys
from algo import kmp_search, build_lps
lines = sys.stdin.read().split("\n")
print(" ".join(map(str, kmp_search(lines[0], lines[1]))))
print(" ".join(map(str, build_lps(lines[1]))))
