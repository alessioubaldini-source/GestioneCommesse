export function formatCurrency(amount) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);
}

export function generateId(array) {
  return array.length > 0 ? Math.max(...array.map((item) => item.id)) + 1 : 1;
}
