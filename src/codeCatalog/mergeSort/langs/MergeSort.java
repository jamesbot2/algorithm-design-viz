import java.util.Arrays;

/** Merge sort — complete Java reference (in-place merge, L/R/k). */
public final class MergeSort {
    public static int[] mergeSort(int[] a) {
        int[] arr = a.clone();
        sort(arr, 0, arr.length - 1);
        return arr; // @a: done
    }

    private static void sort(int[] a, int L, int R) {
        if (L >= R) return; // @a: return
        int mid = (L + R) / 2; // @a: divide
        sort(a, L, mid); // @a: recurse+1
        sort(a, mid + 1, R);
        merge(a, L, mid, R);
    }

    private static void merge(int[] a, int L, int mid, int R) {
        int[] left = Arrays.copyOfRange(a, L, mid + 1); // @a: mergeSlice+1
        int[] right = Arrays.copyOfRange(a, mid + 1, R + 1);
        int i = 0, j = 0, k = L;
        while (i < left.length && j < right.length) {
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
        while (i < left.length) {
            a[k] = left[i]; // @a: mergeCopyLeft
            i++;
            k++;
        }
        while (j < right.length) {
            a[k] = right[j]; // @a: mergeCopyRight
            j++;
            k++;
        }
    }
}
