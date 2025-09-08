'use strict';

const spinnerOverlay = document.getElementById('spinner-overlay');

export function showSpinner() {
  if (spinnerOverlay) {
    spinnerOverlay.classList.remove('hidden');
  }
}

export function hideSpinner() {
  if (spinnerOverlay) {
    spinnerOverlay.classList.add('hidden');
  }
}
