"use client";

import { createWorker, Worker, PSM } from "tesseract.js";

let worker: Worker | null = null;
let workerReady = false;

/**
 * Tune Tesseract via .env: NEXT_PUBLIC_OCR_PSM=4|6|11|13
 * - 4 = single column | 6 = uniform block (default) | 11 = sparse text | 13 = raw line
 */
const PSM_MAP: Record<string, PSM> = {
  "4": PSM.SINGLE_COLUMN,
  "6": PSM.SINGLE_BLOCK,
  "11": PSM.SPARSE_TEXT,
  "13": PSM.RAW_LINE,
};
const psmEnv =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_OCR_PSM
    ? process.env.NEXT_PUBLIC_OCR_PSM
    : "6";
const OCR_PSM: PSM = PSM_MAP[psmEnv] ?? PSM.SINGLE_BLOCK;

/**
 * Preprocess image for better OCR: scale to a good resolution and convert to grayscale.
 * Tesseract works best with 300 DPI equivalent; grayscale reduces noise.
 */
async function preprocessForOCR(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxSide = 1600;
      const minSide = 400;
      let w = img.width;
      let h = img.height;
      let scale = maxSide / Math.max(w, h);
      if (scale * Math.min(w, h) < minSide)
        scale = minSide / Math.min(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(blob);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      // Grayscale improves text recognition for many cards
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = Math.round(g);
      }
      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob(
        (b) => (b ? resolve(b) : resolve(blob)),
        "image/png",
        0.95
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for preprocessing"));
    };
    img.src = url;
  });
}

export async function initOCR(): Promise<void> {
  if (workerReady) return;

  worker = await createWorker("eng");
  await worker.setParameters({ tessedit_pageseg_mode: OCR_PSM });
  workerReady = true;
}

export function isOCRReady(): boolean {
  return workerReady;
}

/**
 * Run OCR with Tesseract: image is preprocessed (resize + grayscale) then recognized.
 */
export async function runOCR(image: Blob): Promise<string> {
  if (!worker || !workerReady) {
    throw new Error("OCR not initialized");
  }
  const preprocessed = await preprocessForOCR(image);
  const { data } = await worker.recognize(preprocessed);
  return data.text;
}
