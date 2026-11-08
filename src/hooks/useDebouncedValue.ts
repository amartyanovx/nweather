import { useEffect, useState } from 'react';
import { DEBOUNCE_MS } from '@/lib/cityQuery';

export const useDebouncedValue = <T>(value: T, delay: number = DEBOUNCE_MS): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
