/** Insertion sort — complete Java reference. */
public final class InsertionSort {
    public static int[] insertionSort(int[] a) {
        int[] arr = a.clone();
        for (int i = 1; i < arr.length; i++) {
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
}
