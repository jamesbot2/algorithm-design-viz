import java.io.*;
import java.util.*;
public class Main {
  public static void main(String[] args) throws IOException {
    String[] lines = new String(System.in.readAllBytes()).split("\n", -1);
    int W = Integer.parseInt(lines[0].trim());
    int[] w = Arrays.stream(lines[1].trim().split("\\s+")).filter(s -> !s.isEmpty()).mapToInt(Integer::parseInt).toArray();
    long[] vals = Arrays.stream(lines[2].trim().split("\\s+")).filter(s -> !s.isEmpty()).mapToLong(Long::parseLong).toArray();
    KnapsackGreedy.Result r = KnapsackGreedy.knapsackGreedyByDensity(w, vals, W);
    System.out.println(r.value());
    StringJoiner j = new StringJoiner(" ");
    for (int i : r.selected()) j.add(String.valueOf(i));
    System.out.println(j);
  }
}
