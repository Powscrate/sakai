
// src/hooks/use-local-storage.ts
import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key);
        // Check if item exists and is not the literal string "undefined"
        if (item && item !== "undefined") {
          setStoredValue(JSON.parse(item));
        } else {
          // Handles null, or the problematic "undefined" string
          setStoredValue(initialValue);
          window.localStorage.setItem(key, JSON.stringify(initialValue));
        }
      } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
        // If parsing fails for any other reason, also revert to initialValue and reset localStorage
        setStoredValue(initialValue);
        window.localStorage.setItem(key, JSON.stringify(initialValue));
      }
      setIsInitialized(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Only run once on mount to initialize from localStorage

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      if (typeof window === 'undefined' || !isInitialized) {
        // If on server or not yet initialized, just update state
        // This avoids trying to write to localStorage too early or on server
        setStoredValue(prev => (value instanceof Function ? value(prev) : value));
        return;
      }
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        // Avoid storing the string "undefined"
        if (valueToStore === undefined) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue, isInitialized]
  );
  
  const currentValue = typeof window === 'undefined' || !isInitialized ? initialValue : storedValue;

  return [currentValue, setValue];
}

export default useLocalStorage;
