"use client";

// Reference photos are too large for localStorage, so the cart keeps them in
// IndexedDB keyed by cart line id until checkout uploads them privately.
const dbName = "craftkiya-photos";
const storeName = "photos";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(storeName, mode).objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export const savePhoto = (id: string, file: Blob) => run("readwrite", (store) => store.put(file, id));
export const getPhoto = async (id: string) => {
  try { return (await run<Blob | undefined>("readonly", (store) => store.get(id))) || null; } catch { return null; }
};
export const deletePhoto = (id: string) => run("readwrite", (store) => store.delete(id)).catch(() => undefined);
export const clearPhotos = () => run("readwrite", (store) => store.clear()).catch(() => undefined);

export const acceptedPhotoTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const maxPhotoBytes = 12 * 1024 * 1024;

export function validatePhoto(file: File) {
  const type = file.type || (/\.(heic|heif)$/i.test(file.name) ? "image/heic" : "");
  if (!acceptedPhotoTypes.includes(type)) return "Choose a JPG, PNG, WEBP or HEIC photo.";
  if (file.size > maxPhotoBytes) return "Choose a photo smaller than 12 MB.";
  return "";
}
