import sys
from algo import edit_distance
lines = sys.stdin.read().split("\n") + ["", ""]
print(edit_distance(lines[0], lines[1]))
