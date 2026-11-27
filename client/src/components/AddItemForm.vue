<script setup>
// Adding a new element by id. The server applies additions once per 10 s,
// so the id is shown as "queued" until the response arrives.
import { ref } from 'vue';
import { api } from '../api/index.js';
import { notifyError, notifySuccess } from '../composables/useToasts.js';

const emit = defineEmits(['added']);

const value = ref('');
const pending = ref([]);

function parseId(raw) {
  const str = raw.trim();
  if (!/^-?\d+$/.test(str)) return null;
  const n = Number(str);
  return Number.isSafeInteger(n) ? n : null;
}

async function submit() {
  const id = parseId(value.value);
  if (id === null) return notifyError('ID должен быть целым числом');
  if (pending.value.includes(id)) return notifyError(`ID ${id} уже в очереди на добавление`);

  value.value = '';
  pending.value.push(id);
  try {
    await api.addItem(id);
    notifySuccess(`Элемент ${id} добавлен`);
    emit('added', id);
  } catch (e) {
    notifyError(e.message);
  } finally {
    pending.value = pending.value.filter((x) => x !== id);
  }
}
</script>

<template>
  <form class="add-form" @submit.prevent="submit">
    <input v-model="value" class="input" inputmode="numeric" placeholder="Новый ID" autocomplete="off" />
    <button class="btn" type="submit">Добавить</button>
  </form>
  <p v-if="pending.length" class="pending">
    В очереди на добавление (батч раз в 10 с):
    <span v-for="id in pending" :key="id" class="chip">{{ id }}</span>
  </p>
</template>
