/** LCS DP + reconstruct — complete Java reference. */
public final class Lcs {
  public record Result(int length, String sequence) {}

  public static Result lcs(String X, String Y) {
    int m = X.length();
    int n = Y.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 0; i <= m; i++) dp[i][0] = 0;  // @a: init+1
    for (int j = 0; j <= n; j++) dp[0][j] = 0;
    for (int i = 1; i <= m; i++) {
      for (int j = 1; j <= n; j++) {
        if (X.charAt(i - 1) == Y.charAt(j - 1)) {  // @a: compareChars
          dp[i][j] = dp[i - 1][j - 1] + 1;  // @a: takeDiagonal, write, dpWrite
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);  // @a: dpFill
        }
      }
    }
    int i = m;  // @a: reconstructStart+1
    int j = n;
    StringBuilder chars = new StringBuilder();
    while (i > 0 && j > 0) {
      if (X.charAt(i - 1) == Y.charAt(j - 1)) {
        chars.append(X.charAt(i - 1));  // @a: reconstruct
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {  // @a: reconstructMove, reconstructCompare
        i--;  // @a: reconstructUp
      } else {
        j--;  // @a: reconstructLeft
      }
    }
    return new Result(dp[m][n], chars.reverse().toString());  // @a: done
  }
}
