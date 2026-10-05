import java.io.*;
import java.util.*;
public class Main {
  public static void main(String[] args) throws IOException {
    String s = new String(System.in.readAllBytes()).trim();
    long[] a = s.isEmpty() ? new long[0] : Arrays.stream(s.split("\\s+")).mapToLong(Long::parseLong).toArray();
    long[] r = Kadane.kadane(a);
    System.out.println(r == null ? "null" : r[0] + " " + r[1] + " " + r[2]);
  }
}
