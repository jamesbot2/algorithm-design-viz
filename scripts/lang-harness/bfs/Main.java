import java.io.*;
import java.util.*;
public class Main {
  public static void main(String[] args) throws IOException {
    String[] lines = new String(System.in.readAllBytes()).split("\n", -1);
    String[] h = lines[0].trim().split("\\s+");
    int n = Integer.parseInt(h[0]), start = Integer.parseInt(h[1]);
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) {
      List<Integer> l = new ArrayList<>();
      String t = lines[1 + i].trim();
      if (!t.isEmpty()) for (String f : t.split("\\s+")) l.add(Integer.parseInt(f));
      adj.add(l);
    }
    Bfs.Result r = Bfs.bfs(adj, start);
    StringJoiner a = new StringJoiner(" "), b = new StringJoiner(" ");
    for (int x : r.dist()) a.add(String.valueOf(x));
    for (int x : r.parent()) b.add(String.valueOf(x));
    System.out.println(a);
    System.out.println(b);
  }
}
