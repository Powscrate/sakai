
// src/hooks/use-local-storage.ts
import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let item;
      try {
        item = window.localStorage.getItem(key);
      } catch (error) {
        console.error(`Error reading localStorage key "${key}" (could be disabled or unavailable):`, error);
        item = null; // Treat as if item doesn't exist
      }
      
      if (item && item !== "undefined" && item !== "null") {
        try {
          setStoredValue(JSON.parse(item));
        } catch (error) {
          console.error(`Error parsing localStorage key "${key}":`, error, "Raw item:", item);
          setStoredValue(initialValue); // Fallback to initialValue if parsing fails
          try {
            window.localStorage.setItem(key, JSON.stringify(initialValue));
          } catch (e) { /* ignore write error */ }
        }
      } else {
        setStoredValue(initialValue);
        if (item === "undefined" || item === "null") { // Overwrite problematic literal strings
          try {
            window.localStorage.setItem(key, JSON.stringify(initialValue));
          } catch (e) { /* ignore write error */ }
        }
      }
      setIsInitialized(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Only re-run if the key changes. InitialValue should be stable.

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      if (typeof window === 'undefined') {
        setStoredValue(prev => (value instanceof Function ? value(prev) : value));
        return;
      }
      
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        
        if (!isInitialized) { 
          // If not yet initialized from localStorage, queue the write until after initialization
          // to avoid race conditions or overwriting initial load.
          // This case is less likely with current setup but good for robustness.
          return;
        }

        if (valueToStore === undefined) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue, isInitialized] // Include isInitialized
  );
  
  return [isInitialized ? storedValue : initialValue, setValue];
}

export default useLocalStorage;
