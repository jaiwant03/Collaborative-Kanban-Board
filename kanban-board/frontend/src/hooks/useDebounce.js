import { useState, useEffect } from 'react';

/**
 * Debounce a rapidly-changing value.
 * @param {*} value
 * @param {number} delay - milliseconds
 */
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
