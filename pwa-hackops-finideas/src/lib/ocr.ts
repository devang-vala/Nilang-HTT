"use client";

import { createWorker, Worker } from "tesseract.js";

let worker: Worker | null = null;
let workerReady = false;

export async function initOCR(): Promise<void> {
  if (workerReady) return;

  worker = await createWorker("eng");
  workerReady = true;
}

export function isOCRReady(): boolean {
  return workerReady;
}

export async function runOCR(image: Blob): Promise<string> {
  if (!worker || !workerReady) {
    throw new Error("OCR not initialized");
  }

  const { data } = await worker.recognize(image);
  return data.text;
}
