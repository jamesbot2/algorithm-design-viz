// Bubble sort — complete C++17 reference.
#include <vector>

std::vector<int> bubbleSort(std::vector<int> arr) {
    int n = static_cast<int>(arr.size());
    for (int i = 0; i < n - 1; i++) { // @a: init
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) { // @a: compare
                int t = arr[j]; // @a: swap+2
                arr[j] = arr[j + 1];
                arr[j + 1] = t;
            }
        }
    }
    return arr; // @a: done, return
}
