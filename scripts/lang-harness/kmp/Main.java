import java.io.*;
import java.util.*;
public class Main {
  public static void main(String[] a) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String t = br.readLine(); if (t == null) t = "";
    String p = br.readLine(); if (p == null) p = "";
    StringJoiner h = new StringJoiner(" ");
    for (int x : Kmp.kmpSearch(t, p)) h.add(String.valueOf(x));
    System.out.println(h);
    StringJoiner l = new StringJoiner(" ");
    for (int x : Kmp.buildLps(p)) l.add(String.valueOf(x));
    System.out.println(l);
  }
}
