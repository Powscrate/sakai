
// src/lib/indexeddb.ts
import type { ChatSession, AIPersonality } from '@/app/page';

const DB_NAME = 'SakaiDB';
const DB_VERSION = 1; // Incrémentez pour les changements de schéma
const CHAT_SESSIONS_STORE = 'chatSessions';
const USER_SETTINGS_STORE = 'userSettings';

interface UserSetting<T = any> {
  key: string; // ex: 'userMemory_UID', 'activeChatId_UID'
  value: T;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      // Retourner une promesse rejetée si pas dans un environnement de navigateur
      // Cela peut être intercepté par l'appelant pour gérer le cas SSR ou test.
      return reject(new Error('IndexedDB can only be used in the browser.'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CHAT_SESSIONS_STORE)) {
        const store = db.createObjectStore(CHAT_SESSIONS_STORE, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(USER_SETTINGS_STORE)) {
        db.createObjectStore(USER_SETTINGS_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      dbPromise = null; // Réinitialiser la promesse en cas d'erreur pour permettre une nouvelle tentative
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
  return dbPromise;
}

// --- ChatSessions ---
export async function addOrUpdateChatSession(session: ChatSession): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CHAT_SESSIONS_STORE, 'readwrite');
    const store = transaction.objectStore(CHAT_SESSIONS_STORE);
    const request = store.put(session);
    request.onsuccess = () => resolve();
    request.onerror = (errEvent) => {
        console.error('Error in addOrUpdateChatSession:', request.error);
        reject(request.error);
    };
  });
}

export async function getChatSession(id: string): Promise<ChatSession | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CHAT_SESSIONS_STORE, 'readonly');
    const store = transaction.objectStore(CHAT_SESSIONS_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (errEvent) => {
        console.error('Error in getChatSession:', request.error);
        reject(request.error);
    };
  });
}

export async function getAllChatSessions(userId: string): Promise<ChatSession[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CHAT_SESSIONS_STORE, 'readonly');
    const store = transaction.objectStore(CHAT_SESSIONS_STORE);
    const index = store.index('userId');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const sortedSessions = (request.result as ChatSession[]).sort((a, b) => b.createdAt - a.createdAt);
      resolve(sortedSessions);
    };
    request.onerror = (errEvent) => {
        console.error('Error in getAllChatSessions:', request.error);
        reject(request.error);
    };
  });
}

export async function deleteChatSession(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CHAT_SESSIONS_STORE, 'readwrite');
    const store = transaction.objectStore(CHAT_SESSIONS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = (errEvent) => {
        console.error('Error in deleteChatSession:', request.error);
        reject(request.error);
    };
  });
}

export async function deleteAllChatSessionsForUser(userId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CHAT_SESSIONS_STORE, 'readwrite');
        const store = transaction.objectStore(CHAT_SESSIONS_STORE);
        const index = store.index('userId');
        const request = index.openCursor(IDBKeyRange.only(userId));
        let deletedCount = 0;

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                store.delete(cursor.primaryKey);
                deletedCount++;
                cursor.continue();
            } else {
                console.log(`Deleted ${deletedCount} chat sessions for user ${userId}`);
                resolve();
            }
        };
        request.onerror = (errEvent) => {
            console.error('Error in deleteAllChatSessionsForUser:', request.error);
            reject(request.error);
        };
    });
}


// --- UserSettings ---
export async function saveSetting<T>(key: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(USER_SETTINGS_STORE, 'readwrite');
    const store = transaction.objectStore(USER_SETTINGS_STORE);
    const settingToStore: UserSetting<T> = { key, value };
    const request = store.put(settingToStore);
    request.onsuccess = () => resolve();
    request.onerror = (errEvent) => {
        console.error(`Error in saveSetting for key "${key}":`, request.error);
        reject(request.error);
    };
  });
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(USER_SETTINGS_STORE, 'readonly');
    const store = transaction.objectStore(USER_SETTINGS_STORE);
    const request = store.get(key);
    request.onsuccess = () => {
      const result = request.result as UserSetting<T> | undefined;
      if (result && result.value !== undefined && result.value !== null) {
        resolve(result.value);
      } else {
        resolve(defaultValue);
      }
    };
    request.onerror = (errEvent) => {
        console.error(`Error in getSetting for key "${key}":`, request.error);
        // Resolve with defaultValue on error to allow app to continue gracefully
        resolve(defaultValue);
    };
  });
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(USER_SETTINGS_STORE, 'readwrite');
    const store = transaction.objectStore(USER_SETTINGS_STORE);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = (errEvent) => {
        console.error(`Error in deleteSetting for key "${key}":`, request.error);
        reject(request.error);
    };
  });
}

// Supprime tous les paramètres dont la clé se termine par '_UID'
export async function deleteAllUserSettingsForUser(userId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(USER_SETTINGS_STORE, 'readwrite');
        const store = transaction.objectStore(USER_SETTINGS_STORE);
        const request = store.openCursor(); 
        let deletedCount = 0;

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                if (typeof cursor.key === 'string' && cursor.key.endsWith(`_${userId}`)) {
                    store.delete(cursor.key);
                    deletedCount++;
                }
                cursor.continue();
            } else {
                console.log(`Deleted ${deletedCount} settings for user ${userId}`);
                resolve();
            }
        };
        request.onerror = (errEvent) => {
            console.error('Error in deleteAllUserSettingsForUser:', request.error);
            reject(request.error);
        };
    });
}

// Export types for convenience if needed elsewhere, though ChatSession is from app/page
export type { ChatSession, AIPersonality };
export type { UserSetting };
