import { ref, watch, onBeforeUnmount } from 'vue';
import { FILTER_DEBOUNCE_MS } from '../config.js';

/**
 * Filter by id substring.
 */
export function useFilter(onChange) {
  const input = ref('');
  const applied = ref('');
  let timer = null;

  watch(input, (value) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      applied.value = value.trim();
      onChange?.(applied.value);
    }, FILTER_DEBOUNCE_MS);
  });

  onBeforeUnmount(() => clearTimeout(timer));

  const matches = (id) => applied.value === '' || String(id).includes(applied.value);

  return { input, applied, matches };
}
