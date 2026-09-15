/** Pseudocode + C++ reference for 0-1 knapsack DP2D — verified against demo cases in tests. */
export const knapsackDp2dPseudo = `DP2D 0-1 背包
输入: w[1..n], v[1..n], W
dp[0][*]=0; dp[*][0]=0
for i=1..n:
  for c=0..W:
    dp[i][c]=dp[i-1][c]
    if c>=w[i]: dp[i][c]=max(dp[i][c], dp[i-1][c-w[i]]+v[i])
回溯选中集从 dp[n][W]`

export const knapsackDp2dCpp = `// NOT executed in CI (no compiler required). Reference only.
#include <vector>
#include <algorithm>
using namespace std;
pair<int, vector<int>> knapsack01(const vector<int>& w, const vector<int>& v, int W) {
  int n = (int)w.size();
  vector<vector<int>> dp(n+1, vector<int>(W+1, 0));
  for (int i = 1; i <= n; ++i) {
    for (int c = 0; c <= W; ++c) {
      dp[i][c] = dp[i-1][c];
      if (c >= w[i-1]) dp[i][c] = max(dp[i][c], dp[i-1][c-w[i-1]] + v[i-1]);
    }
  }
  vector<int> pick;
  int c = W;
  for (int i = n; i >= 1; --i) {
    if (dp[i][c] != dp[i-1][c]) { pick.push_back(i-1); c -= w[i-1]; }
  }
  reverse(pick.begin(), pick.end());
  return {dp[n][W], pick};
}`
