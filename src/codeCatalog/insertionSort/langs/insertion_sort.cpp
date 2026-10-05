// Insertion sort — complete C++17 reference.
#include <vector>

std::vector<int> insertionSort(std::vector<int> arr) {
    for (int i = 1; i < static_cast<int>(arr.size()); i++) {
        int key = arr[i]; // @a: outer
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j]; // @a: shift
            j--;
        }
        arr[j + 1] = key; // @a: insert
    }
    return arr; // @a: done, return
}
