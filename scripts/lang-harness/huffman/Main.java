import java.io.*;
import java.util.*;
public class Main {
  static TreeMap<String, String> codes = new TreeMap<>();
  static long walk(Huffman.HNode n, String p, int d) {
    if (n.left == null && n.right == null) { codes.put(n.ch, p); return n.freq * d; }
    return walk(n.left, p + "0", d + 1) + walk(n.right, p + "1", d + 1);
  }
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String l1 = br.readLine().trim(), l2 = br.readLine().trim(), mode = br.readLine().trim();
    String[] sym = l1.isEmpty() ? new String[0] : l1.split("\\s+");
    long[] fr = l2.isEmpty() ? new long[0] : Arrays.stream(l2.split("\\s+")).mapToLong(Long::parseLong).toArray();
    Huffman.HNode r = Huffman.huffman(sym, fr);
    System.out.println(r == null ? 0 : walk(r, "", 0));
    if (mode.equals("codes")) {
      StringJoiner j = new StringJoiner(" ");
      codes.forEach((k, v) -> j.add(k + "=" + v));
      System.out.println(j);
    }
  }
}
