import sys
from algo import bubble_sort
a = [int(x) for x in sys.stdin.read().split()]
print(" ".join(str(x) for x in bubble_sort(a)))
