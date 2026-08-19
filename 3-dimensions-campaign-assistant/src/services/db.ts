/**
 * IndexedDB Native Wrapper for 3 Dimensions Campaign Assistant
 */

const DB_NAME = '3Dimensions_CampaignAssistant_DB';
const DB_VERSION = 3;

export const STORES = {
  MARKETING_DATA: 'marketing_data',
  DATASET_METADATA: 'dataset_metadata',
  CAMPAIGNS: 'campaigns',
  CAMPAIGN_PLANS: 'campaign_plans',
  CONTENT_ASSETS: 'content_assets',
  FEEDBACK_MEMORY: 'feedback_memory',
  BRAND_KIT: 'brand_kit',
  PRODUCTS_SERVICES: 'products_services',
  CAMPAIGN_REFERENCES: 'campaign_references',
  WIDGET_PREFERENCES: 'widget_preferences',
  STAFF_MEMBERS: 'staff_members',
  APP_SETTINGS: 'app_settings',
  CUSTOM_ROLES: 'custom_roles',
  CUSTOM_CAMPAIGN_TYPES: 'custom_campaign_types',
  CUSTOM_TARGET_AUDIENCES: 'custom_target_audiences',
  CUSTOM_LOCATION_GROUPS: 'custom_location_groups',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains(STORES.MARKETING_DATA)) {
        db.createObjectStore(STORES.MARKETING_DATA, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.DATASET_METADATA)) {
        db.createObjectStore(STORES.DATASET_METADATA, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CAMPAIGNS)) {
        db.createObjectStore(STORES.CAMPAIGNS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CAMPAIGN_PLANS)) {
        db.createObjectStore(STORES.CAMPAIGN_PLANS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CONTENT_ASSETS)) {
        db.createObjectStore(STORES.CONTENT_ASSETS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.FEEDBACK_MEMORY)) {
        db.createObjectStore(STORES.FEEDBACK_MEMORY, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.BRAND_KIT)) {
        db.createObjectStore(STORES.BRAND_KIT, { keyPath: 'companyName' });
      }
      if (!db.objectStoreNames.contains(STORES.PRODUCTS_SERVICES)) {
        db.createObjectStore(STORES.PRODUCTS_SERVICES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CAMPAIGN_REFERENCES)) {
        db.createObjectStore(STORES.CAMPAIGN_REFERENCES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.WIDGET_PREFERENCES)) {
        db.createObjectStore(STORES.WIDGET_PREFERENCES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.STAFF_MEMBERS)) {
        db.createObjectStore(STORES.STAFF_MEMBERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.APP_SETTINGS)) {
        db.createObjectStore(STORES.APP_SETTINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.CUSTOM_ROLES)) {
        db.createObjectStore(STORES.CUSTOM_ROLES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CUSTOM_CAMPAIGN_TYPES)) {
        db.createObjectStore(STORES.CUSTOM_CAMPAIGN_TYPES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CUSTOM_TARGET_AUDIENCES)) {
        db.createObjectStore(STORES.CUSTOM_TARGET_AUDIENCES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CUSTOM_LOCATION_GROUPS)) {
        db.createObjectStore(STORES.CUSTOM_LOCATION_GROUPS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getByIdFromStore<T>(storeName: string, id: string): Promise<T | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as T) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveToStore<T>(storeName: string, item: T): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveBatchToStore<T>(storeName: string, items: T[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    items.forEach((item) => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFromStore(storeName: string, id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function executeMultiStoreTransaction(
  storeNames: string[],
  callback: (stores: Record<string, IDBObjectStore>) => void
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    const storeMap: Record<string, IDBObjectStore> = {};
    for (const name of storeNames) {
      storeMap[name] = tx.objectStore(name);
    }
    try {
      callback(storeMap);
    } catch (err) {
      tx.abort();
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}
