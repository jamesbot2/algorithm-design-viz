/** Bubble sort — complete Java reference. */
public final class BubbleSort {
    public static int[] bubbleSort(int[] a) {
        int[] arr = a.clone();
        int n = arr.length;
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
}
