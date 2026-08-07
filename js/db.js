/**
 * db.js
 * -----
 * A tiny wrapper around the browser's built-in IndexedDB database.
 *
 * WHY INDEXEDDB (not just a variable in memory)?
 * Phones/tablets can be closed, restarted, or lose battery between the time
 * a volunteer collects someone's info and the time the device gets signal
 * again. IndexedDB writes to the device's actual storage, so records survive
 * app restarts, browser restarts, and even device reboots -- exactly what
 * "collect offline, sync later" requires.
 *
 * This file exposes a single global object: RgvbfDB
 *   RgvbfDB.addContact(record)      -> saves one sign-up, returns its id
 *   RgvbfDB.getAll()                -> every record stored on this device
 *   RgvbfDB.getUnsynced()           -> all records not yet sent to Google Sheets
 *   RgvbfDB.markSynced(id)          -> flags a record as sent
 *   RgvbfDB.countUnsynced()         -> quick count for the "pending" pill
 *   RgvbfDB.countAll()              -> total records stored on this device
 *   RgvbfDB.deleteSynced()          -> removes only records already sent to the Sheet
 *   RgvbfDB.deleteAll()             -> wipes every record on this device
 */

const RgvbfDB = (() => {
  const DB_NAME = "rgvbf-outreach";
  const DB_VERSION = 1;
  const STORE = "contacts";

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
          store.createIndex("synced", "synced", { unique: false });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function withStore(mode, callback) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const result = callback(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    });
  }

  function addContact(record) {
    return withStore("readwrite", (store) => {
      store.add({
        ...record,
        synced: 0, // 0 = pending, 1 = synced. Stored as a number so the index works well.
        createdAt: new Date().toISOString(),
      });
    });
  }

  function getAll() {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readonly");
          const store = tx.objectStore(STORE);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        })
    );
  }

  async function getUnsynced() {
    const all = await getAll();
    return all.filter((r) => !r.synced);
  }

  async function countUnsynced() {
    const unsynced = await getUnsynced();
    return unsynced.length;
  }

  function markSynced(id) {
    return withStore("readwrite", (store) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.synced = 1;
          record.syncedAt = new Date().toISOString();
          store.put(record);
        }
      };
    });
  }

  async function countAll() {
    const all = await getAll();
    return all.length;
  }

  // Removes only records already confirmed sent to the Google Sheet.
  // Safe to run any time -- nothing pending sync is touched.
  async function deleteSynced() {
    const all = await getAll();
    const toDelete = all.filter((r) => r.synced).map((r) => r.id);
    await withStore("readwrite", (store) => {
      toDelete.forEach((id) => store.delete(id));
    });
    return toDelete.length;
  }

  // Wipes every record on this device, synced or not. Callers should
  // confirm with the person using the app before calling this -- there is
  // no undo once this runs.
  async function deleteAll() {
    const countBefore = await countAll();
    await withStore("readwrite", (store) => {
      store.clear();
    });
    return countBefore;
  }

  return {
    addContact,
    getAll,
    getUnsynced,
    countUnsynced,
    countAll,
    markSynced,
    deleteSynced,
    deleteAll,
  };
})();
