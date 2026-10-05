// Floyd-Warshall — complete C++ reference.
#include <limits>
#include <vector>

const double INF = std::numeric_limits<double>::infinity();  // missing edge

std::vector<std::vector<double>> floyd(const std::vector<std::vector<double>>& dist) {
  const size_t n = dist.size();
  std::vector<std::vector<double>> d = dist;  // @a: init
  for (size_t k = 0; k < n; k++) {  // @a: kLoop
    for (size_t i = 0; i < n; i++) {
      for (size_t j = 0; j < n; j++) {
        if (d[i][k] + d[k][j] < d[i][j]) {  // @a: relax
          d[i][j] = d[i][k] + d[k][j];  // @a: update
        }
      }
    }
  }
  return d;  // @a: done
}
