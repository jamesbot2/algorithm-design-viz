// KMP string matching — complete C++ reference.
#include <string>
#include <vector>

std::vector<int> buildLps(const std::string& pattern);

std::vector<int> kmpSearch(const std::string& text, const std::string& pattern) {
  std::vector<int> hits;
  if (pattern.empty()) return {0};  // @a: emptyPattern
  const std::vector<int> lps = buildLps(pattern);  // @a: buildLps
  size_t i = 0;
  size_t j = 0;
  while (i < text.size()) {
    if (text[i] == pattern[j]) {  // @a: match
      i++;
      j++;
      if (j == pattern.size()) {
        hits.push_back(static_cast<int>(i - j));  // @a: hit
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

std::vector<int> buildLps(const std::string& pattern) {
  std::vector<int> lps(pattern.size(), 0);
  int len = 0;
  size_t i = 1;
  while (i < pattern.size()) {
    if (pattern[i] == pattern[len]) {  // @a: lpsCompare
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
