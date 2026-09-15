export const nQueensPseudo = `N 皇后回溯
place(row):
  if row==n: record solution; return
  for col in 0..n-1:
    if safe(row,col): board[row]=col; place(row+1)
safe: 不同列且主/副对角线不冲突`

export const nQueensCpp = `// NOT executed in CI. Reference only.
#include <vector>
using namespace std;
bool safe(const vector<int>& pos, int row, int col) {
  for (int r = 0; r < row; ++r) {
    int c = pos[r];
    if (c == col || abs(c - col) == abs(r - row)) return false;
  }
  return true;
}
void dfs(int n, int row, vector<int>& pos, vector<vector<int>>& out) {
  if (row == n) { out.push_back(pos); return; }
  for (int col = 0; col < n; ++col) if (safe(pos, row, col)) {
    pos[row] = col; dfs(n, row+1, pos, out);
  }
}
vector<vector<int>> solveNQueens(int n) {
  vector<vector<int>> out; vector<int> pos(n);
  dfs(n, 0, pos, out); return out;
}`
