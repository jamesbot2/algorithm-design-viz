import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** 0-1 knapsack greedy-by-density (NOT optimal) — complete Java reference. */
public final class KnapsackGreedy {
    public record Result(long value, List<Integer> selected) {}

    public static Result knapsackGreedyByDensity(int[] weights, long[] values, int W) {
        List<Integer> order = new ArrayList<>();
        for (int i = 0; i < weights.length; i++) order.add(i);
        order.sort(Comparator.comparingDouble(i -> -(double) values[i] / weights[i])); // @a: sort
        int rem = W;
        long value = 0;
        List<Integer> selected = new ArrayList<>();
        for (int i : order) {
            if (weights[i] <= rem) { // @a: check
                rem -= weights[i];
                value += values[i];
                selected.add(i); // @a: pick
            }
        }
        return new Result(value, selected); // @a: done
    }
}
