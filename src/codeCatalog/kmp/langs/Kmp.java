import java.util.ArrayList;
import java.util.List;

/** KMP string matching — complete Java reference. */
public final class Kmp {
  public static List<Integer> kmpSearch(String text, String pattern) {
    List<Integer> hits = new ArrayList<>();
    if (pattern.isEmpty()) return List.of(0);  // @a: emptyPattern
    int[] lps = buildLps(pattern);  // @a: buildLps
    int i = 0;
    int j = 0;
    while (i < text.length()) {
      if (text.charAt(i) == pattern.charAt(j)) {  // @a: match
        i++;
        j++;
        if (j == pattern.length()) {
          hits.add(i - j);  // @a: hit
          j = lps[j - 1];
        }
      } else if (j > 0) {  // @a: fallback
        j = lps[j - 1];  // @a: fallbackWrite
      } else {
        i++;  // @a: advance
      }
    }
    return hits;  // @a: done, return
  }

  static int[] buildLps(String pattern) {
    int[] lps = new int[pattern.length()];
    int len = 0;
    int i = 1;
    while (i < pattern.length()) {
      if (pattern.charAt(i) == pattern.charAt(len)) {  // @a: lpsCompare
        len++;  // @a: lpsExtend+1
        lps[i] = len;
        i++;
      } else if (len > 0) {  // @a: lpsFallbackCond
        len = lps[len - 1];  // @a: lpsFallback
      } else {
        lps[i] = 0;  // @a: lpsZero+1
        i++;
      }
    }
    return lps;  // @a: lpsReturn
  }
}
