import java.io.*;
public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String a = br.readLine(); if (a == null) a = "";
    String b = br.readLine(); if (b == null) b = "";
    System.out.println(EditDistance.editDistance(a, b));
  }
}
