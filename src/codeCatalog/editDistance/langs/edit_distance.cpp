// Edit distance (Levenshtein) — complete C++17 reference.
#include <algorithm>
#include <string>
#include <vector>

int editDistance(const std::string& a, const std::string& b) {
    int m = static_cast<int>(a.size());
    int n = static_cast<int>(b.size());
    std::vector<std::vector<int>> dp(m + 1, std::vector<int>(n + 1, 0));
    for (int i = 0; i <= m; i++) dp[i][0] = i; // @a: init
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (a[i - 1] == b[j - 1]) dp[i][j] = dp[i - 1][j - 1]; // @a: equal
            else {
                dp[i][j] = 1 + std::min({dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]}); // @a: replace
            }
        }
    }
    return dp[m][n]; // @a: done, return
}
