// File System Access helpers with IndexedDB persistence for directory handles
// Uses native Windows Explorer dialog via showDirectoryPicker on supported browsers.

const DB_NAME = 'pobFSHandles';
const STORE = 'handles';

function openDB() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) { reject(e); }
  });
}

async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(value, key);
  });
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    tx.onerror = () => reject(tx.error);
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDel(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(key);
  });
}

export const fsx = {
  isSupported: () => typeof window !== 'undefined' && 'showDirectoryPicker' in window,
  pickDirectory: async () => {
    if (!('showDirectoryPicker' in window)) throw new Error('Directory picker not supported');
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    return handle;
  },
  storeDirHandle: async (key, handle) => idbSet(key, handle),
  getDirHandle: async (key) => idbGet(key),
  clearDirHandle: async (key) => idbDel(key),
  ensurePermission: async (handle, mode = 'readwrite') => {
    if (!handle) return false;
    try {
      const opts = { mode };
      if ((await handle.queryPermission?.(opts)) === 'granted') return true;
      const res = await handle.requestPermission?.(opts);
      return res === 'granted';
    } catch { return false; }
  },
  saveFile: async (dirHandle, fileName, contents) => {
    if (!dirHandle) throw new Error('No directory handle');
    const hasPerm = await fsx.ensurePermission(dirHandle, 'readwrite');
    if (!hasPerm) throw new Error('Permission denied');
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
  }
};
