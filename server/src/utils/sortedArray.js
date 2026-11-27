/** Index of the first element of a sorted array that is strictly greater than `value`. */
export function upperBound(arr, value) {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Inserts `value` into a sorted array keeping it sorted. */
export function insertSorted(arr, value) {
  arr.splice(upperBound(arr, value), 0, value);
}
