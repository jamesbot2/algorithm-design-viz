import sys
from algo import Activity, activity_selection
l = sys.stdin.read().split("\n")
st = [int(x) for x in l[0].split()]
en = [int(x) for x in l[1].split()]
print(" ".join(activity_selection([Activity(f"A{i}", st[i], en[i]) for i in range(len(st))])))
