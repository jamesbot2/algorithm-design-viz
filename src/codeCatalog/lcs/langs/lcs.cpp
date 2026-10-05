// LCS DP + reconstruct — complete C++ reference.
#include <algorithm>
#include <string>
#include <vector>

struct LcsResult {
  int length;
  std::string sequence;
};

LcsResult lcs(const std::string& X, const std::string& Y) {
  const int m = static_cast<int>(X.size());
  const int n = static_cast<int>(Y.size());
  std::vector<std::vector<int>> dp(m + 1, std::vector<int>(n + 1, 0));
  for (int i = 0; i <= m; i++) dp[i][0] = 0;  // @a: init+1
  for (int j = 0; j <= n; j++) dp[0][j] = 0;
  for (int i = 1; i <= m; i++) {
    for (int j = 1; j <= n; j++) {
      if (X[i - 1] == Y[j - 1]) {  // @a: compareChars
        dp[i][j] = dp[i - 1][j - 1] + 1;  // @a: takeDiagonal, write, dpWrite
      } else {
        dp[i][j] = std::max(dp[i - 1][j], dp[i][j - 1]);  // @a: dpFill
      }
    }
  }
  int i = m;  // @a: reconstructStart+1
  int j = n;
  std::string chars;
  while (i > 0 && j > 0) {
    if (X[i - 1] == Y[j - 1]) {
      chars.push_back(X[i - 1]);  // @a: reconstruct
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {  // @a: reconstructMove, reconstructCompare
      i--;  // @a: reconstructUp
    } else {
      j--;  // @a: reconstructLeft
    }
  }
  return {dp[m][n], std::string(chars.rbegin(), chars.rend())};  // @a: done
}
