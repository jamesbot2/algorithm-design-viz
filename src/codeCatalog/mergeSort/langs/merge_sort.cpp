// Merge sort — complete C++17 reference (in-place merge, L/R/k).
#include <vector>

void sortRange(std::vector<int>& a, int L, int R);
void mergeRange(std::vector<int>& a, int L, int mid, int R);

std::vector<int> mergeSort(std::vector<int> arr) {
    sortRange(arr, 0, static_cast<int>(arr.size()) - 1);
    return arr; // @a: done
}

void sortRange(std::vector<int>& a, int L, int R) {
    if (L >= R) return; // @a: return
    int mid = (L + R) / 2; // @a: divide
    sortRange(a, L, mid); // @a: recurse+1
    sortRange(a, mid + 1, R);
    mergeRange(a, L, mid, R);
}

void mergeRange(std::vector<int>& a, int L, int mid, int R) {
    std::vector<int> left(a.begin() + L, a.begin() + mid + 1); // @a: mergeSlice+1
    std::vector<int> right(a.begin() + mid + 1, a.begin() + R + 1);
    int i = 0, j = 0, k = L;
    while (i < static_cast<int>(left.size()) && j < static_cast<int>(right.size())) {
        if (left[i] <= right[j]) { // @a: mergeCompare
            a[k] = left[i]; // @a: mergeWriteLeft
            i++;
            k++;
        } else {
            a[k] = right[j]; // @a: mergeWriteRight
            j++;
            k++;
        }
    }
    while (i < static_cast<int>(left.size())) {
        a[k] = left[i]; // @a: mergeCopyLeft
        i++;
        k++;
    }
    while (j < static_cast<int>(right.size())) {
        a[k] = right[j]; // @a: mergeCopyRight
        j++;
        k++;
    }
}
