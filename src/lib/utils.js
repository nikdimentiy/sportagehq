export function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

export function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

export function handleError(error) {
  console.error('Error:', error);
  alert('An error occurred. Check the console.');
}
