import java.io.*;
import java.util.*;
public class Main {
  public static void main(String[] args) throws IOException {
    String[] lines = new String(System.in.readAllBytes()).trim().split("\n");
    int n = Integer.parseInt(lines[0].trim());
    List<Kruskal.Edge> edges = new ArrayList<>();
    for (int k = 1; k < lines.length; k++) {
      String[] f = lines[k].trim().split("\\s+");
      edges.add(new Kruskal.Edge(Integer.parseInt(f[0]), Integer.parseInt(f[1]), Long.parseLong(f[2])));
    }
    Kruskal.Result r = Kruskal.kruskal(n, edges);
    StringJoiner j = new StringJoiner(" ");
    for (Kruskal.Edge e : r.mst()) j.add(e.u() + "-" + e.v() + ":" + e.w());
    System.out.println(r.total());
    System.out.println(j);
  }
}
