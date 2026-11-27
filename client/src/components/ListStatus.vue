<script setup>
// Error / empty state under a list.
defineProps({
  error: { type: String, default: null },
  empty: Boolean,
  emptyText: { type: String, default: 'Ничего не найдено' },
});
defineEmits(['retry']);
</script>

<template>
  <p v-if="error" class="error">
    {{ error }} <button class="link" type="button" @click="$emit('retry')">Повторить</button>
  </p>
  <p v-else-if="empty" class="muted center">{{ emptyText }}</p>
</template>
