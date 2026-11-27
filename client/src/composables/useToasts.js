import { ref } from 'vue';
import { TOAST_TIMEOUT_MS } from '../config.js';

// Shared state: any component can show a notification.
const toasts = ref([]);
let lastId = 0;

export function notify(text, type = 'info') {
  const id = ++lastId;
  toasts.value.push({ id, type, text });
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, TOAST_TIMEOUT_MS);
}

export const notifyError = (text) => notify(text, 'error');
export const notifySuccess = (text) => notify(text, 'success');

export function useToasts() {
  return { toasts, notify, notifyError, notifySuccess };
}
