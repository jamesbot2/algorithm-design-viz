import java.io.*;
import java.util.*;
public class Main {
  public static void main(String[] args) throws IOException {
    String[] lines = new String(System.in.readAllBytes()).trim().split("\n");
    String[] h = lines[0].trim().split("\\s+");
    int n = Integer.parseInt(h[0]), start = Integer.parseInt(h[1]);
    List<List<Prim.Arc>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (int k = 1; k < lines.length; k++) {
      String[] f = lines[k].trim().split("\\s+");
      int u = Integer.parseInt(f[0]), v = Integer.parseInt(f[1]);
      double w = Double.parseDouble(f[2]);
      adj.get(u).add(new Prim.Arc(v, w));
      adj.get(v).add(new Prim.Arc(u, w));
    }
    Prim.Result r = Prim.prim(n, adj, start);
    List<String> es = new ArrayList<>();
    for (int i = 0; i < n; i++) if (r.parent()[i] >= 0) es.add(Math.min(r.parent()[i], i) + "-" + Math.max(r.parent()[i], i));
    Collections.sort(es);
    System.out.println((long) r.total());
    System.out.println(String.join(" ", es));
  }
}
