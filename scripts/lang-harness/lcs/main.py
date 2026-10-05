import sys
from algo import lcs
lines = sys.stdin.read().split("\n")
length, seq = lcs(lines[0], lines[1])
print(f"{length} {seq}")
