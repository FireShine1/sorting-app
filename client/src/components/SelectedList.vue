<script setup>
// Right container: selected elements in user order, reordered by drag & drop.
// Offset pagination over the (filtered) list.
import { onMounted } from 'vue';
import draggable from 'vuedraggable';
import { api } from '../api/index.js';
import { usePagedList } from '../composables/usePagedList.js';
import { useFilter } from '../composables/useFilter.js';
import { notifyError } from '../composables/useToasts.js';
import InfiniteSentinel from './InfiniteSentinel.vue';
import ListStatus from './ListStatus.vue';

const emit = defineEmits(['deselect']);

const list = usePagedList((loaded) =>
  api.getSelected({ filter: filter.applied.value, offset: loaded.length }),
);
const filter = useFilter(() => list.reload());
const { input: filterInput } = filter;
const { items, hasMore, loading, error } = list;

onMounted(list.reload);

/** A newly selected id goes to the end of the list. */
function append(id) {
  if (!filter.matches(id) || items.value.includes(id)) return;
  // If not everything is loaded yet, it will come with a later page.
  if (!hasMore.value) items.value.push(id);
}

function deselect(id) {
  list.remove(id);
  emit('deselect', id);
}

/**
 * The visible list may be filtered, so the move is sent relative to a
 * neighbour: "put X before Y" (or "after Y" when dropped at the end).
 * The server applies it to the full list, so hidden elements keep their
 * relative order.
 */
async function onDragEnd({ oldIndex, newIndex }) {
  if (oldIndex === newIndex) return;
  const arr = items.value;
  const id = arr[newIndex];
  const [targetId, position] = newIndex < arr.length - 1
    ? [arr[newIndex + 1], 'before']
    : [arr[newIndex - 1], 'after'];
  try {
    await api.reorder(id, targetId, position);
  } catch (e) {
    notifyError(e.message);
    list.reload();
  }
}

defineExpose({ append, reload: list.reload });
</script>

<template>
  <section class="panel">
    <header class="panel-head">
      <h2>Выбранные</h2>
      <input v-model="filterInput" class="input" type="search" placeholder="Фильтр по ID" autocomplete="off" />
      <p class="muted hint">Перетаскивайте элементы, чтобы изменить порядок</p>
    </header>

    <div class="scroll">
      <draggable
        v-model="items"
        tag="ul"
        class="list"
        :item-key="(id) => id"
        :animation="150"
        :force-fallback="true"
        ghost-class="row--ghost"
        chosen-class="row--chosen"
        fallback-class="row--fallback"
        filter=".icon-btn"
        :prevent-on-filter="false"
        @end="onDragEnd"
      >
        <template #item="{ element }">
          <li class="row row--draggable">
            <span class="drag-handle" aria-hidden="true">⠿</span>
            <span class="row-id">{{ element }}</span>
            <button class="icon-btn" type="button" title="Убрать из выбранных" @click.stop="deselect(element)">✕</button>
          </li>
        </template>
      </draggable>
      <ListStatus
        :error="error"
        :empty="!loading && !items.length && !hasMore"
        :empty-text="filterInput ? 'Ничего не найдено' : 'Нажмите на элемент слева, чтобы выбрать его'"
        @retry="list.loadMore"
      />
      <InfiniteSentinel :loading="loading" :has-more="hasMore && !error" @load="list.loadMore" />
    </div>
  </section>
</template>
