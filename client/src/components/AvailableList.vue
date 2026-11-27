<script setup>
// Left container: all elements except the selected ones, ascending by id.
// Cursor pagination: the next page starts after the last loaded id.
import { onMounted } from 'vue';
import { api } from '../api/index.js';
import { usePagedList } from '../composables/usePagedList.js';
import { useFilter } from '../composables/useFilter.js';
import InfiniteSentinel from './InfiniteSentinel.vue';
import ListStatus from './ListStatus.vue';
import AddItemForm from './AddItemForm.vue';

const emit = defineEmits(['select']);

const list = usePagedList((loaded) =>
  api.getItems({ filter: filter.applied.value, after: loaded.at(-1) ?? null }),
);
const filter = useFilter(() => list.reload());
const { input: filterInput } = filter;
const { items, hasMore, loading, error } = list;

onMounted(list.reload);

/** Puts an id into the loaded part of the list, keeping ascending order. */
function insert(id) {
  if (!filter.matches(id) || items.value.includes(id)) return;
  const arr = items.value;
  const last = arr.at(-1);
  // Beyond the loaded range it will arrive with a later page.
  if (hasMore.value && (last === undefined || id > last)) return;
  const index = arr.findIndex((x) => x > id);
  arr.splice(index === -1 ? arr.length : index, 0, id);
}

function select(id) {
  list.remove(id);
  emit('select', id);
}

defineExpose({ insert, reload: list.reload });
</script>

<template>
  <section class="panel">
    <header class="panel-head">
      <h2>Все элементы</h2>
      <input v-model="filterInput" class="input" type="search" placeholder="Фильтр по ID" autocomplete="off" />
      <AddItemForm @added="insert" />
    </header>

    <div class="scroll">
      <ul class="list">
        <li v-for="id in items" :key="id" class="row row--clickable" title="Выбрать" @click="select(id)">
          <span class="row-id">{{ id }}</span>
          <span class="row-action">→</span>
        </li>
      </ul>
      <ListStatus :error="error" :empty="!loading && !items.length && !hasMore" @retry="list.loadMore" />
      <InfiniteSentinel :loading="loading" :has-more="hasMore && !error" @load="list.loadMore" />
    </div>
  </section>
</template>
