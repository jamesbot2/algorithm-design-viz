// Activity selection (greedy by finish) — complete C++17 reference.
#include <algorithm>
#include <limits>
#include <string>
#include <vector>

struct Activity { std::string id; double start, finish; };

std::vector<std::string> activitySelection(const std::vector<Activity>& activities) {
    std::vector<Activity> sorted = activities;
    std::stable_sort(sorted.begin(), sorted.end(), [](const Activity& a, const Activity& b) { return a.finish < b.finish; }); // @a: sort
    std::vector<std::string> picked;
    double lastFinish = -std::numeric_limits<double>::infinity();
    for (const Activity& act : sorted) {
        if (act.start >= lastFinish) { // @a: check
            picked.push_back(act.id); // @a: pick
            lastFinish = act.finish;
        }
    }
    return picked; // @a: done
}
