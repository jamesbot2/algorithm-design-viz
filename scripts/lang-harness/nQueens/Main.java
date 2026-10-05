import java.io.*;
import java.util.*;
public class Main {
  public static void main(String[] args) throws IOException {
    int n = Integer.parseInt(new String(System.in.readAllBytes()).trim());
    List<int[]> s = NQueens.solveNQueens(n);
    StringBuilder b = new StringBuilder().append(s.size()).append('\n');
    for (int[] v : s) {
      StringJoiner j = new StringJoiner(" ");
      for (int x : v) j.add(String.valueOf(x));
      b.append(j).append('\n');
    }
    System.out.print(b);
  }
}
