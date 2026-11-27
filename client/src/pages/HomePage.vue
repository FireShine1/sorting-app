<script setup>
// The only page: two containers that exchange elements.
// The UI is updated optimistically; the server applies the change with the
// next batch (<= 1 s). If it fails, both lists are reloaded from the server.
import { ref } from 'vue';
import { api } from '../api/index.js';
import { notifyError } from '../composables/useToasts.js';
import AvailableList from '../components/AvailableList.vue';
import SelectedList from '../components/SelectedList.vue';

const available = ref(null);
const selected = ref(null);

async function sync(request) {
  try {
    await request;
  } catch (e) {
    notifyError(e.message);
    available.value.reload();
    selected.value.reload();
  }
}

function onSelect(id) {
  selected.value.append(id);
  sync(api.select(id));
}

function onDeselect(id) {
  available.value.insert(id);
  sync(api.deselect(id));
}
</script>

<template>
  <main class="page">
    <h1>1 000 000 элементов</h1>
    <div class="panels">
      <AvailableList ref="available" @select="onSelect" />
      <SelectedList ref="selected" @deselect="onDeselect" />
    </div>
  </main>
</template>
