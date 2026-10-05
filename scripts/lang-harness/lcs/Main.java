import java.io.*;
public class Main {
  public static void main(String[] a) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String X = br.readLine(); if (X == null) X = "";
    String Y = br.readLine(); if (Y == null) Y = "";
    Lcs.Result r = Lcs.lcs(X, Y);
    System.out.println(r.length() + " " + r.sequence());
  }
}
