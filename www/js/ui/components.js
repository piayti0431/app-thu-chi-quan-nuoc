export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => [...document.querySelectorAll(selector)];

let toastTimer = null;
export function showToast(message, isError = false) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast is-visible${isError ? ' is-error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 2600);
}
