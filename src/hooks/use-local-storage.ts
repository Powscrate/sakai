
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
        item = null; 
      }
      
      if (item && item !== "undefined" && item !== "null") {
        try {
          setStoredValue(JSON.parse(item));
        } catch (error) {
          console.error(`Error parsing localStorage key "${key}":`, error, "Raw item:", item);
          setStoredValue(initialValue); 
          try {
            window.localStorage.setItem(key, JSON.stringify(initialValue));
          } catch (e) { /* ignore write error */ }
        }
      } else {
        setStoredValue(initialValue);
        if (item === "undefined" || item === "null") { 
          try {
            window.localStorage.setItem(key, JSON.stringify(initialValue));
          } catch (e) { /* ignore write error */ }
        }
      }
      setIsInitialized(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); 

  const setValue = useCallback(
    (valueOrFn: T | ((prevState: T) => T)) => {
      setStoredValue(currentStoredValue => {
        const valueToStore = valueOrFn instanceof Function ? valueOrFn(currentStoredValue) : valueOrFn;
        
        if (typeof window !== 'undefined' && isInitialized) {
          try {
            if (valueToStore === undefined) {
              window.localStorage.removeItem(key);
            } else {
              window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
          } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
          }
        }
        return valueToStore;
      });
    },
    [key, isInitialized] 
  );
  
  return [isInitialized ? storedValue : initialValue, setValue];
}

export default useLocalStorage;
