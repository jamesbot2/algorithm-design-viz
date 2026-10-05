import java.io.*;
import java.util.*;
public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    double[] st = Arrays.stream(br.readLine().trim().split("\\s+")).mapToDouble(Double::parseDouble).toArray();
    double[] en = Arrays.stream(br.readLine().trim().split("\\s+")).mapToDouble(Double::parseDouble).toArray();
    List<ActivitySelection.Activity> acts = new ArrayList<>();
    for (int i = 0; i < st.length; i++) acts.add(new ActivitySelection.Activity("A" + i, st[i], en[i]));
    System.out.println(String.join(" ", ActivitySelection.activitySelection(acts)));
  }
}
