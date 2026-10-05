import java.io.*;
import java.util.*;
public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int W = Integer.parseInt(br.readLine().trim());
    int[] w = Arrays.stream(br.readLine().trim().split("\\s+")).mapToInt(Integer::parseInt).toArray();
    long[] v = Arrays.stream(br.readLine().trim().split("\\s+")).mapToLong(Long::parseLong).toArray();
    System.out.println(KnapsackDp2d.knapsackDp2d(w, v, W).maxValue());
  }
}
