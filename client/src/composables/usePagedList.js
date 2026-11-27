import { ref } from 'vue';

/**
 * Infinite list state.
 * `fetchPage(items)` gets the currently loaded items and returns
 * `{ items, hasMore }` for the next portion (max 20 elements).
 * Responses that belong to an outdated filter are dropped.
 */
export function usePagedList(fetchPage) {
  const items = ref([]);
  const hasMore = ref(true);
  const loading = ref(false);
  const error = ref(null);
  let generation = 0;

  async function loadMore() {
    if (loading.value || !hasMore.value) return;
    const gen = generation;
    loading.value = true;
    error.value = null;
    try {
      const page = await fetchPage(items.value);
      if (gen !== generation) return;
      const known = new Set(items.value);
      items.value.push(...page.items.filter((id) => !known.has(id)));
      hasMore.value = page.hasMore;
    } catch (e) {
      if (gen === generation) error.value = e.message;
    } finally {
      if (gen === generation) loading.value = false;
    }
  }

  function reset() {
    generation++;
    items.value = [];
    hasMore.value = true;
    loading.value = false;
    error.value = null;
  }

  function reload() {
    reset();
    loadMore();
  }

  function remove(id) {
    const i = items.value.indexOf(id);
    if (i !== -1) items.value.splice(i, 1);
  }

  return { items, hasMore, loading, error, loadMore, reset, reload, remove };
}
