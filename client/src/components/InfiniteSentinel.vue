<script setup>
// Invisible element at the end of a scroll container: when it is within
// MARGIN px of the visible area, the next portion is requested.

import { nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  loading: Boolean,
  hasMore: Boolean,
});
const emit = defineEmits(['load']);

// Preload distance.
const MARGIN = 50;
const el = ref(null);
let root = null;
let intersectionObserver = null;
let resizeObserver = null;

function isNearEnd() {
  if (!el.value || !root) return false;
  const target = el.value.getBoundingClientRect();
  const box = root.getBoundingClientRect();
  // +1 px tolerance for fractional coordinates
  return target.top <= box.bottom + MARGIN + 1 && target.bottom >= box.top - MARGIN - 1;
}

function check() {
  if (props.hasMore && !props.loading && isNearEnd()) emit('load');
}

onMounted(() => {
  root = el.value.closest('.scroll');

  intersectionObserver = new IntersectionObserver(() => check(), { root, rootMargin: `${MARGIN}px` });
  intersectionObserver.observe(el.value);

  // Scrolling inside the container.
  root.addEventListener('scroll', check, { passive: true });

  // Rows added/removed (e.g. an element was selected) or the container resized.
  resizeObserver = new ResizeObserver(() => check());
  resizeObserver.observe(root);
  if (root.firstElementChild) resizeObserver.observe(root.firstElementChild);
});

watch(() => [props.loading, props.hasMore], () => nextTick(check));

onBeforeUnmount(() => {
  intersectionObserver?.disconnect();
  resizeObserver?.disconnect();
  root?.removeEventListener('scroll', check);
});
</script>

<template>
  <div ref="el" class="sentinel">
    <span v-if="loading" class="muted">Загрузка…</span>
    <span v-else-if="!hasMore" class="muted">Больше элементов нет</span>
  </div>
</template>
