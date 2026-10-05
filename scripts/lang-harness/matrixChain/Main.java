import java.io.*;
import java.util.*;
public class Main {
  static int[][] S;
  static String paren(int i, int j) {
    return i == j ? "A" + (i + 1) : "(" + paren(i, S[i][j]) + paren(S[i][j] + 1, j) + ")";
  }
  public static void main(String[] args) throws IOException {
    long[] d = Arrays.stream(new String(System.in.readAllBytes()).trim().split("\\s+")).mapToLong(Long::parseLong).toArray();
    MatrixChain.Result r = MatrixChain.matrixChainOrder(d);
    S = r.split();
    System.out.println(r.cost());
    System.out.println(paren(0, d.length - 2));
  }
}
