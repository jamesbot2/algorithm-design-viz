import sys
from algo import insertion_sort
a = [int(x) for x in sys.stdin.read().split()]
print(" ".join(str(x) for x in insertion_sort(a)))
