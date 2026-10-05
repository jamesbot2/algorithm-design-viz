/** Binary search — leftmost (lower-bound style) Java reference. */
public final class BinarySearch {
    public static int binarySearch(int[] a, int target) {
        int lo = 0; // @a: init+2
        int hi = a.length - 1;
        int candidate = -1;
        while (lo <= hi) {
            int mid = lo + ((hi - lo) >> 1); // @a: mid
            if (a[mid] == target) { // @a: equal+2
                candidate = mid;
                hi = mid - 1;
            } else if (a[mid] < target) { // @a: less+1
                lo = mid + 1;
            } else { // @a: greater+1
                hi = mid - 1;
            }
        }
        return candidate; // @a: found, miss
    }
}
