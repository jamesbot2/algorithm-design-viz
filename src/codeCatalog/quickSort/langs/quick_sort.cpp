// Quick sort (Lomuto, i = L-1 style) — C++17 reference aligned with the trace.
#include <utility>
#include <vector>

void qs(std::vector<int>& arr, int L, int R);
int partition(std::vector<int>& arr, int L, int R);

std::vector<int> quickSort(std::vector<int> arr) {
    qs(arr, 0, static_cast<int>(arr.size()) - 1);
    return arr; // @a: done, return
}

void qs(std::vector<int>& arr, int L, int R) {
    if (L >= R) return; // @a: baseCase
    int p = partition(arr, L, R); // @a: recurse+2
    qs(arr, L, p - 1);
    qs(arr, p + 1, R);
}

int partition(std::vector<int>& arr, int L, int R) {
    int pivot = arr[R]; // @a: partition
    int i = L - 1;
    for (int j = L; j < R; j++) {
        if (arr[j] <= pivot) { // @a: compare
            i++; // @a: loopSwap+1, swap+1
            std::swap(arr[i], arr[j]);
        }
    }
    int p = i + 1; // @a: pivotPlace+1
    std::swap(arr[p], arr[R]);
    return p;
}
