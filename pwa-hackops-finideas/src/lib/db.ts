"use client";

import { openDB, IDBPDatabase } from "idb";

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB can only be used in the browser");
  }

  if (!dbPromise) {
    dbPromise = openDB("finideas-lead-db", 3, {
      upgrade(db, oldVersion) {
        // v1: leads store (OCR cards)
        if (!db.objectStoreNames.contains("leads")) {
          db.createObjectStore("leads", { keyPath: "id" });
        }
        console.log("DB Upgrade - oldVersion:", oldVersion);
        // v2: contacts store (Stall + Field form submissions)
        if (!db.objectStoreNames.contains("contacts")) {
          const contactStore = db.createObjectStore("contacts", { keyPath: "id" });
          contactStore.createIndex("syncStatus", "syncStatus");
          contactStore.createIndex("captureMode", "captureMode");
          contactStore.createIndex("email", "email");
          contactStore.createIndex("contactNo", "contactNo");
          contactStore.createIndex("createdAt", "createdAt");
        }
        // v2: sync queue for retry logic
        if (!db.objectStoreNames.contains("syncQueue")) {
          const syncStore = db.createObjectStore("syncQueue", { keyPath: "id" });
          syncStore.createIndex("status", "status");
          syncStore.createIndex("createdAt", "createdAt");
        }
        // v3: recordings store (audio recording & transcript)
        if (!db.objectStoreNames.contains("recordings")) {
          const recStore = db.createObjectStore("recordings", {
            keyPath: "id",
            autoIncrement: true,
          });
          recStore.createIndex("synced", "synced");
          recStore.createIndex("createdAt", "createdAt");
        }
      },
    });
  }

  return dbPromise;
}