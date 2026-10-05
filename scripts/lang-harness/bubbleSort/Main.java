import java.io.*;
import java.util.*;
public class Main {
  public static void main(String[] args) throws IOException {
    String s = new String(System.in.readAllBytes()).trim();
    int[] a = s.isEmpty() ? new int[0] : Arrays.stream(s.split("\\s+")).mapToInt(Integer::parseInt).toArray();
    StringJoiner j = new StringJoiner(" ");
    for (int x : BubbleSort.bubbleSort(a)) j.add(String.valueOf(x));
    System.out.println(j);
  }
}
