import java.io.*;
import java.util.*;
public class Main {
  public static void main(String[] args) throws IOException {
    String[] f = new String(System.in.readAllBytes()).trim().split("\\s+");
    int t = Integer.parseInt(f[0]);
    int[] a = Arrays.stream(f).skip(1).mapToInt(Integer::parseInt).toArray();
    System.out.println(BinarySearch.binarySearch(a, t));
  }
}
