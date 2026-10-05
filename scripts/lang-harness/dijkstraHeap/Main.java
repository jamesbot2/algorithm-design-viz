import java.io.*;
import java.util.*;
public class Main {
  public static void main(String[] args) throws IOException {
    String[] lines = new String(System.in.readAllBytes()).trim().split("\n");
    String[] h = lines[0].trim().split("\\s+");
    int n = Integer.parseInt(h[0]), start = Integer.parseInt(h[1]);
    List<List<DijkstraHeap.Arc>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (int k = 1; k < lines.length; k++) {
      String[] f = lines[k].trim().split("\\s+");
      adj.get(Integer.parseInt(f[0])).add(new DijkstraHeap.Arc(Integer.parseInt(f[1]), Double.parseDouble(f[2])));
    }
    DijkstraHeap.Result r = DijkstraHeap.dijkstraHeap(n, start, adj);
    StringJoiner a = new StringJoiner(" "), b = new StringJoiner(" ");
    for (double x : r.dist()) a.add(Double.isInfinite(x) ? "INF" : String.valueOf((long) x));
    for (int x : r.parent()) b.add(String.valueOf(x));
    System.out.println(a);
    System.out.println(b);
  }
}
