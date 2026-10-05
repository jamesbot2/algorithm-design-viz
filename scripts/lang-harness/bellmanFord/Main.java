import java.io.*;
import java.util.*;
public class Main {
  public static void main(String[] args) throws IOException {
    String[] lines = new String(System.in.readAllBytes()).trim().split("\n");
    String[] h = lines[0].trim().split("\\s+");
    int n = Integer.parseInt(h[0]), start = Integer.parseInt(h[1]);
    List<BellmanFord.Edge> edges = new ArrayList<>();
    for (int k = 1; k < lines.length; k++) {
      String[] f = lines[k].trim().split("\\s+");
      edges.add(new BellmanFord.Edge(Integer.parseInt(f[0]), Integer.parseInt(f[1]), Double.parseDouble(f[2])));
    }
    BellmanFord.Result r = BellmanFord.bellmanFord(n, edges, start);
    if (h[2].equals("full")) {
      StringJoiner a = new StringJoiner(" "), b = new StringJoiner(" ");
      for (double x : r.dist()) a.add(Double.isInfinite(x) ? "INF" : String.valueOf((long) x));
      for (int x : r.parent()) b.add(String.valueOf(x));
      System.out.println(a);
      System.out.println(b);
    }
    System.out.println(r.negCycle());
  }
}
