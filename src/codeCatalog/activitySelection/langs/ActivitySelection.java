import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Activity selection (greedy by finish) — complete Java reference. */
public final class ActivitySelection {
    public record Activity(String id, double start, double finish) {}

    public static List<String> activitySelection(List<Activity> activities) {
        List<Activity> sorted = new ArrayList<>(activities);
        sorted.sort(Comparator.comparingDouble(Activity::finish)); // @a: sort
        List<String> picked = new ArrayList<>();
        double lastFinish = Double.NEGATIVE_INFINITY;
        for (Activity act : sorted) {
            if (act.start() >= lastFinish) { // @a: check
                picked.add(act.id()); // @a: pick
                lastFinish = act.finish();
            }
        }
        return picked; // @a: done
    }
}
