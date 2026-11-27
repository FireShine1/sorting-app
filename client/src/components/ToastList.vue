<script setup>
import { useToasts } from '../composables/useToasts.js';

const { toasts } = useToasts();
</script>

<template>
  <div class="toasts" aria-live="polite">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="`toast--${t.type}`">{{ t.text }}</div>
  </div>
</template>
