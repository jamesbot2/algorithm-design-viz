import sys
from algo import quick_sort
a = [int(x) for x in sys.stdin.read().split()]
print(" ".join(str(x) for x in quick_sort(a)))
