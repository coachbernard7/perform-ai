import { File } from "expo-file-system";

import { getApiBaseUrl } from "@/constants/oauth";

import type { ImportedDocument, ImportedSlide, ImportFile, SlideImportChoice } from "./document-import";

export const IMPORT_MAX_FILE_BYTES = 15 * 1024 * 1024;
export const IMPORT_MAX_EXTRACTED_CHARACTERS = 200_000;
export const IMPORT_MAX_PDF_PAGES = 100;
export const IMPORT_MAX_PPTX_SLIDES = 200;

function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function composeSlideText(slides: ImportedSlide[], choice: SlideImportChoice): string {
  return normalizeText(slides.map((slide) => {
    const slideText = [slide.title, slide.text].filter(Boolean).join("\n");
    if (choice === "slides") return slideText;
    if (choice === "notes") return slide.speakerNotes;
    return [slideText, slide.speakerNotes ? `Speaker notes:\n${slide.speakerNotes}` : ""].filter(Boolean).join("\n\n");
  }).filter(Boolean).join("\n\n"));
}

function importUrl(): string {
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/import/extract` : "/api/import/extract";
}

function toBlob(file: ImportFile): Blob {
  if (file.file instanceof Blob) return file.file;
  return new File(file.uri) as unknown as Blob;
}

export async function extractDocument(file: ImportFile): Promise<ImportedDocument> {
  const blob = toBlob(file);
  if (typeof blob.size === "number" && blob.size > IMPORT_MAX_FILE_BYTES) {
    throw new Error("Files must be 15 MB or smaller.");
  }

  const formData = new FormData();
  formData.append("file", blob, file.name);
  const response = await fetch(importUrl(), { method: "POST", body: formData });
  const payload = await response.json().catch(() => ({} as { error?: string }));
  if (!response.ok) throw new Error(payload.error || "The document could not be imported.");
  return payload as ImportedDocument;
}
