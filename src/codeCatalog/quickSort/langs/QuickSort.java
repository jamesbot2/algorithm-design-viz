/** Quick sort (Lomuto, i = L-1 style) — Java reference aligned with the trace. */
public final class QuickSort {
    public static int[] quickSort(int[] a) {
        int[] arr = a.clone();
        qs(arr, 0, arr.length - 1);
        return arr; // @a: done, return
    }

    private static void qs(int[] arr, int L, int R) {
        if (L >= R) return; // @a: baseCase
        int p = partition(arr, L, R); // @a: recurse+2
        qs(arr, L, p - 1);
        qs(arr, p + 1, R);
    }

    private static int partition(int[] arr, int L, int R) {
        int pivot = arr[R]; // @a: partition
        int i = L - 1;
        for (int j = L; j < R; j++) {
            if (arr[j] <= pivot) { // @a: compare
                i++; // @a: loopSwap+1, swap+1
                int t = arr[i]; arr[i] = arr[j]; arr[j] = t;
            }
        }
        int p = i + 1; // @a: pivotPlace+1
        int t = arr[p]; arr[p] = arr[R]; arr[R] = t;
        return p;
    }
}
