'use strict';

const toastContainer = document.getElementById('toast-container');

/**
 * Shows a toast notification.
 * @param {string} message The message to display.
 * @param {string} type The type of toast ('success' or 'error').
 * @param {number} duration The duration in milliseconds.
 */
export function showToast(message, type = 'success', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  // Trigger the animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);

  // Hide and remove the toast after the duration
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, duration);
}
