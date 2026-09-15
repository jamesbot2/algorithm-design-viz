export const dijkstraNaivePseudo = `朴素 Dijkstra（非负权）
dist[s]=0; 其余=∞; done[*]=false
repeat V times:
  u = argmin { dist[i] | not done[i] }
  if dist[u]=∞: break
  done[u]=true
  for each edge u→v (w):
    if dist[u]+w < dist[v]: dist[v]=dist[u]+w; parent[v]=u`

export const dijkstraNaiveCpp = `// NOT executed in CI. Reference only.
#include <vector>
#include <limits>
using namespace std;
vector<long long> dijkstraNaive(int n, int s, const vector<vector<pair<int,int>>>& adj) {
  const long long INF = numeric_limits<long long>::max()/4;
  vector<long long> dist(n, INF);
  vector<char> done(n, 0);
  dist[s] = 0;
  for (int it = 0; it < n; ++it) {
    int u = -1; long long best = INF;
    for (int i = 0; i < n; ++i)
      if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
    if (u < 0 || best >= INF) break;
    done[u] = 1;
    for (auto [v, w] : adj[u])
      if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
  }
  return dist;
}`
