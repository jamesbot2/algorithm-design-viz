import java.util.*;
public class Main {
  public static void main(String[] a) {
    Scanner sc = new Scanner(System.in);
    int n = sc.nextInt();
    double[][] g = new double[n][n];
    for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) { String t = sc.next(); g[i][j] = t.equals("INF") ? Floyd.INF : Double.parseDouble(t); }
    double[][] d = Floyd.floyd(g);
    for (double[] row : d) {
      StringJoiner s = new StringJoiner(" ");
      for (double x : row) s.add(x == Floyd.INF ? "INF" : String.valueOf((long) x));
      System.out.println(s);
    }
  }
}
