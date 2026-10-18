"""Monotonic stack. next_greater: index of the next STRICTLY greater element to the right, or -1."""


def next_greater(a: list[int]) -> list[int]:
    res = [-1] * len(a)  # @a: msInit
    st: list[int] = []  # indices; values never increase from bottom to top
    for i in range(len(a)):
        while st and a[st[-1]] < a[i]:  # @a: msPopCheck
            res[st.pop()] = i  # @a: msPop
        st.append(i)  # @a: msPush
    return res  # @a: msReturn


def largest_rectangle(h: list[int]) -> int:
    """Largest rectangle in a histogram of non-negative heights (unit-width bars)."""
    st: list[int] = []  # indices; heights strictly increase from bottom to top
    best = 0
    for i in range(len(h) + 1):
        cur = 0 if i == len(h) else h[i]  # sentinel height 0 flushes the stack
        while st and h[st[-1]] >= cur:  # @a: lrPopCheck
            height = h[st.pop()]  # @a: lrPop
            left = 0 if not st else st[-1] + 1  # @a: lrArea+1
            best = max(best, height * (i - left))
        st.append(i)  # @a: lrPush
    return best  # @a: lrReturn
