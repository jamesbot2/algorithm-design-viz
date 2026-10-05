/** Floyd-Warshall — complete Java reference. */
public final class Floyd {
  public static final double INF = Double.POSITIVE_INFINITY; // missing edge

  public static double[][] floyd(double[][] dist) {
    int n = dist.length;
    double[][] d = new double[n][];  // @a: init+3
    for (int r = 0; r < n; r++) {
      d[r] = dist[r].clone();
    }
    for (int k = 0; k < n; k++) {  // @a: kLoop
      for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
          if (d[i][k] + d[k][j] < d[i][j]) {  // @a: relax
            d[i][j] = d[i][k] + d[k][j];  // @a: update
          }
        }
      }
    }
    return d;  // @a: done
  }
}
