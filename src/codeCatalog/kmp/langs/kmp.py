def kmp_search(text: str, pattern: str) -> list[int]:
    """KMP string matching — complete Python reference."""
    hits: list[int] = []
    if not pattern:  # @a: emptyPattern+1
        return [0]
    lps = build_lps(pattern)  # @a: buildLps
    i = 0
    j = 0
    while i < len(text):
        if text[i] == pattern[j]:  # @a: match
            i += 1
            j += 1
            if j == len(pattern):
                hits.append(i - j)  # @a: hit
                j = lps[j - 1]
        elif j > 0:  # @a: fallback
            j = lps[j - 1]  # @a: fallbackWrite
        else:
            i += 1  # @a: advance
    return hits  # @a: done, return


def build_lps(pattern: str) -> list[int]:
    lps = [0] * len(pattern)
    length = 0
    i = 1
    while i < len(pattern):
        if pattern[i] == pattern[length]:  # @a: lpsCompare
            length += 1  # @a: lpsExtend+1
            lps[i] = length
            i += 1
        elif length > 0:  # @a: lpsFallbackCond
            length = lps[length - 1]  # @a: lpsFallback
        else:
            lps[i] = 0  # @a: lpsZero+1
            i += 1
    return lps  # @a: lpsReturn
