import sys
from algo import merge_sort
a = [int(x) for x in sys.stdin.read().split()]
print(" ".join(str(x) for x in merge_sort(a)))
