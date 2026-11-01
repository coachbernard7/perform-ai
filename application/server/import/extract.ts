import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import mammoth from "mammoth";


export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_EXTRACTED_CHARACTERS = 200_000;
export const MAX_PDF_PAGES = 100;
export const MAX_PPTX_SLIDES = 200;
export const MAX_ZIP_ENTRIES = 1_500;
export const MAX_ZIP_UNCOMPRESSED_BYTES = 60 * 1024 * 1024;
export const MAX_ZIP_ENTRY_BYTES = 12 * 1024 * 1024;

export type SourceFormat = "txt" | "pdf" | "docx" | "pptx";

export type ImportedSlide = {
  id: string;
  number: number;
  title: string;
  text: string;
  speakerNotes: string;
};

export type ExtractedDocument = {
  sourceFormat: SourceFormat;
  sourceFilename: string;
  extractionWarnings: string[];
  text: string;
  slides?: ImportedSlide[];
};

const FORMAT_BY_EXTENSION: Record<string, SourceFormat> = {
  ".txt": "txt",
  ".pdf": "pdf",
  ".docx": "docx",
  ".pptx": "pptx",
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: false,
  parseTagValue: false,
});

export class ImportExtractionError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ImportExtractionError";
    this.status = status;
  }
}

function safeFilename(filename: string): string {
  const basename = path.basename(filename || "document").replace(/[\u0000-\u001f]/g, "").trim();
  if (!basename) throw new ImportExtractionError("The uploaded file needs a valid filename.");
  if (basename.length > 255) throw new ImportExtractionError("The filename is too long.");
  return basename;
}

export function getSourceFormat(filename: string): SourceFormat {
  const extension = path.extname(safeFilename(filename)).toLowerCase();
  const format = FORMAT_BY_EXTENSION[extension];
  if (!format) {
    throw new ImportExtractionError("Choose a TXT, PDF, DOCX, or PPTX file.");
  }
  return format;
}

function normalizeText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function assertExtractedText(value: string, label = "document"): string {
  const normalized = normalizeText(value);
  if (!normalized) throw new ImportExtractionError(`No readable text was found in this ${label}.`);
  if (normalized.length > MAX_EXTRACTED_CHARACTERS) {
    throw new ImportExtractionError(`This ${label} contains more than ${MAX_EXTRACTED_CHARACTERS.toLocaleString()} characters of text.`);
  }
  return normalized;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function collectText(node: unknown): string[] {
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  if (!node || typeof node !== "object") return [];

  const values: string[] = [];
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "a:t") {
      for (const text of asArray(value)) values.push(...collectText(text));
    } else if (!key.startsWith("@_")) {
      values.push(...collectText(value));
    }
  }
  return values;
}

function nodeText(node: unknown): string {
  return normalizeText(collectText(node).join(" "));
}

function relationshipMap(relsXml: string, fromPart: string): Map<string, { type: string; target: string }> {
  const parsed = xmlParser.parse(relsXml) as Record<string, any>;
  const relationships = asArray(parsed?.Relationships?.Relationship);
  const map = new Map<string, { type: string; target: string }>();

  for (const relationship of relationships) {
    const id = relationship?.["@_Id"];
    const target = relationship?.["@_Target"];
    const type = relationship?.["@_Type"];
    if (typeof id !== "string" || typeof target !== "string" || typeof type !== "string") continue;
    if (relationship?.["@_TargetMode"] === "External") continue;
    map.set(id, { type, target: resolvePartPath(fromPart, target) });
  }
  return map;
}

function resolvePartPath(fromPart: string, target: string): string {
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(fromPart), target.replace(/^\/+/, "")));
  if (resolved === ".." || resolved.startsWith("../") || resolved.startsWith("/")) {
    throw new ImportExtractionError("The presentation contains an unsafe internal file path.");
  }
  return resolved;
}

function relationshipPartPath(partPath: string): string {
  return path.posix.join(path.posix.dirname(partPath), "_rels", `${path.posix.basename(partPath)}.rels`);
}

function getShapeText(shape: Record<string, any>): string {
  const paragraphs = asArray(shape?.["p:txBody"]?.["a:p"]);
  if (!paragraphs.length) return nodeText(shape?.["p:txBody"]);
  return normalizeText(paragraphs.map((paragraph) => {
    const text = normalizeText(collectText(paragraph).join(" "));
    if (!text) return "";
    const properties = paragraph?.["a:pPr"];
    const bullet = Boolean(properties?.["a:buChar"] || properties?.["a:buAutoNum"]);
    return bullet ? `• ${text}` : text;
  }).filter(Boolean).join("\n"));
}

function getShapes(root: Record<string, any>): Record<string, any>[] {
  const tree = root?.["p:sld"]?.["p:cSld"]?.["p:spTree"] ?? root?.["p:notes"]?.["p:cSld"]?.["p:spTree"];
  const shapes: Record<string, any>[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === "p:sp") shapes.push(...asArray(value as Record<string, any>));
      else if (!key.startsWith("@_")) asArray(value).forEach(visit);
    }
  };
  visit(tree);
  return shapes;
}

function placeholderType(shape: Record<string, any>): string | undefined {
  const placeholder = shape?.["p:nvSpPr"]?.["p:nvPr"]?.["p:ph"];
  const first = asArray(placeholder)[0];
  return typeof first?.["@_type"] === "string" ? first["@_type"] : undefined;
}

function extractSlideParts(root: Record<string, any>): { title: string; text: string } {
  const shapes = getShapes(root);
  const titleShape = shapes.find((shape) => {
    const type = placeholderType(shape);
    return type === "title" || type === "ctrTitle";
  });
  const title = titleShape ? getShapeText(titleShape) : "";
  const bodyShapes = titleShape ? shapes.filter((shape) => shape !== titleShape) : shapes;
  let text = normalizeText(bodyShapes.map(getShapeText).filter(Boolean).join("\n"));
  const fallbackTitle = text.split("\n").find(Boolean)?.replace(/^•\s*/, "").slice(0, 140) || "Untitled slide";
  if (!titleShape && text) text = normalizeText(text.split("\n").slice(1).join("\n")) || text;
  return { title: title || fallbackTitle, text };
}

function extractNotesText(root: Record<string, any>): string {
  const bodyShapes = getShapes(root).filter((shape) => placeholderType(shape) === "body");
  const bodyText = normalizeText(bodyShapes.map(getShapeText).filter(Boolean).join("\n\n"));
  return bodyText || nodeText(root);
}

type ZipFile = {
  dir: boolean;
  unsafeOriginalName?: string;
  _data?: { uncompressedSize?: number };
  async(type: "string"): Promise<string>;
};

function inspectZip(zip: JSZip): void {
  const entries = Object.entries(zip.files) as [string, ZipFile][];
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new ImportExtractionError("This Office document has too many internal files to import safely.");
  }

  let totalUncompressed = 0;
  for (const [name, file] of entries) {
    const originalName = file.unsafeOriginalName ?? name;
    if (originalName.includes("\0") || originalName.split("/").includes("..")) {
      throw new ImportExtractionError("The Office document contains an unsafe internal file path.");
    }
    const size = file._data?.uncompressedSize;
    if (typeof size === "number") {
      if (size > MAX_ZIP_ENTRY_BYTES) {
        throw new ImportExtractionError("This Office document contains an internal file that is too large to import safely.");
      }
      totalUncompressed += size;
      if (totalUncompressed > MAX_ZIP_UNCOMPRESSED_BYTES) {
        throw new ImportExtractionError("This Office document expands to too much data to import safely.");
      }
    }
  }
}

async function loadZip(buffer: Buffer, label: "DOCX" | "PPTX"): Promise<JSZip> {
  try {
    const zip = await JSZip.loadAsync(buffer, { checkCRC32: false, createFolders: false });
    inspectZip(zip);
    return zip;
  } catch (error) {
    if (error instanceof ImportExtractionError) throw error;
    throw new ImportExtractionError(`This file is not a valid ${label} document.`);
  }
}

async function readZipText(zip: JSZip, partPath: string): Promise<string | undefined> {
  const file = zip.file(partPath);
  if (!file || file.dir) return undefined;
  const text = await file.async("string");
  if (text.length > MAX_ZIP_ENTRY_BYTES) {
    throw new ImportExtractionError("The presentation contains an XML file that is too large to import safely.");
  }
  return text;
}

async function extractText(buffer: Buffer): Promise<{ text: string; warnings: string[] }> {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  return { text: assertExtractedText(text, "text file"), warnings: [] };
}

async function extractPdf(buffer: Buffer): Promise<{ text: string; warnings: string[] }> {
  try {
    // The old pdf-parse engine rejects valid tagged PDFs, including our fixture.
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, useSystemFonts: true });
    try {
      const document = await task.promise;
      if (document.numPages > MAX_PDF_PAGES) throw new ImportExtractionError(`PDF files are limited to ${MAX_PDF_PAGES} pages.`);
      let text = "";
      for (let number = 1; number <= document.numPages; number++) {
        const page = await document.getPage(number);
        const content = await page.getTextContent();
        text += content.items.map(item => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("") + "\n\n";
        if (text.length > MAX_EXTRACTED_CHARACTERS) throw new ImportExtractionError("This PDF contains too much text to import safely.");
        page.cleanup();
      }
      return { text: assertExtractedText(text, "PDF"), warnings: [] };
    } finally { await task.destroy(); }
  } catch (error) {
    if (error instanceof ImportExtractionError) throw error;
    throw new ImportExtractionError("This PDF could not be read. It may be encrypted, scanned, or malformed.");
  }
}

async function extractDocx(buffer: Buffer): Promise<{ text: string; warnings: string[] }> {
  await loadZip(buffer, "DOCX");
  try {
    const result = await mammoth.extractRawText({ buffer });
    const warnings = result.messages.map((message) => message.message).filter(Boolean);
    return { text: assertExtractedText(result.value, "DOCX"), warnings };
  } catch (error) {
    if (error instanceof ImportExtractionError) throw error;
    throw new ImportExtractionError("This DOCX file could not be read.");
  }
}

export async function extractPptx(buffer: Buffer): Promise<{ text: string; slides: ImportedSlide[]; warnings: string[] }> {
  const zip = await loadZip(buffer, "PPTX");
  const warnings: string[] = [];
  const presentationXml = await readZipText(zip, "ppt/presentation.xml");
  const presentationRelsXml = await readZipText(zip, "ppt/_rels/presentation.xml.rels");
  if (!presentationXml || !presentationRelsXml || !zip.file("[Content_Types].xml")) {
    throw new ImportExtractionError("This file is not a complete PowerPoint presentation.");
  }

  let presentation: Record<string, any>;
  try {
    presentation = xmlParser.parse(presentationXml) as Record<string, any>;
  } catch {
    throw new ImportExtractionError("The presentation XML could not be read.");
  }

  const presentationRelationships = relationshipMap(presentationRelsXml, "ppt/presentation.xml");
  const slideIds = asArray(presentation?.["p:presentation"]?.["p:sldIdLst"]?.["p:sldId"]);
  if (!slideIds.length) throw new ImportExtractionError("No slides were found in this presentation.");
  if (slideIds.length > MAX_PPTX_SLIDES) {
    throw new ImportExtractionError(`PowerPoint files are limited to ${MAX_PPTX_SLIDES} slides.`);
  }

  const slides: ImportedSlide[] = [];
  for (let index = 0; index < slideIds.length; index += 1) {
    const slideId = slideIds[index];
    const relId = slideId?.["@_r:id"];
    const relation = typeof relId === "string" ? presentationRelationships.get(relId) : undefined;
    if (!relation || !/\/slide$/i.test(relation.type)) {
      warnings.push(`Slide ${index + 1} could not be located and was skipped.`);
      continue;
    }

    const slideXml = await readZipText(zip, relation.target);
    if (!slideXml) {
      warnings.push(`Slide ${index + 1} could not be read and was skipped.`);
      continue;
    }

    try {
      const slideRoot = xmlParser.parse(slideXml) as Record<string, any>;
      const { title, text } = extractSlideParts(slideRoot);
      let speakerNotes = "";
      const relsXml = await readZipText(zip, relationshipPartPath(relation.target));
      if (relsXml) {
        const slideRelationships = relationshipMap(relsXml, relation.target);
        const notesRelationship = [...slideRelationships.values()].find(({ type }) => /\/notesSlide$/i.test(type));
        if (notesRelationship) {
          const notesXml = await readZipText(zip, notesRelationship.target);
          if (notesXml) {
            speakerNotes = extractNotesText(xmlParser.parse(notesXml) as Record<string, any>);
          } else {
            warnings.push(`Slide ${index + 1} has speaker notes that could not be read.`);
          }
        }
      }
      slides.push({ id: `slide-${index + 1}`, number: index + 1, title, text, speakerNotes });
    } catch (error) {
      if (error instanceof ImportExtractionError) throw error;
      warnings.push(`Slide ${index + 1} could not be parsed and was skipped.`);
    }
  }

  if (!slides.length) throw new ImportExtractionError("No readable slides were found in this presentation.");
  const text = assertExtractedText(
    slides.map((slide) => [slide.title, slide.text, slide.speakerNotes].filter(Boolean).join("\n\n")).join("\n\n"),
    "PowerPoint presentation",
  );
  return { text, slides, warnings };
}

export async function extractDocument(filename: string, buffer: Buffer): Promise<ExtractedDocument> {
  const sourceFilename = safeFilename(filename);
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new ImportExtractionError("The uploaded file is empty.");
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new ImportExtractionError(`Files must be ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB or smaller.`, 413);
  }

  const sourceFormat = getSourceFormat(sourceFilename);
  if (sourceFormat === "pptx") {
    const extraction = await extractPptx(buffer);
    return {
      sourceFormat,
      sourceFilename,
      extractionWarnings: extraction.warnings,
      text: extraction.text,
      slides: extraction.slides,
    };
  }

  const extraction = sourceFormat === "txt"
    ? await extractText(buffer)
    : sourceFormat === "pdf"
      ? await extractPdf(buffer)
      : await extractDocx(buffer);

  return {
    sourceFormat,
    sourceFilename,
    extractionWarnings: extraction.warnings,
    text: extraction.text,
  };
}

export function buildScriptText(slides: ImportedSlide[], selection: "slides+notes" | "slides" | "notes"): string {
  const sections = slides
    .map((slide) => {
      const slideText = [slide.title, slide.text].filter(Boolean).join("\n");
      if (selection === "slides") return slideText;
      if (selection === "notes") return slide.speakerNotes;
      return [slideText, slide.speakerNotes ? `Speaker notes:\n${slide.speakerNotes}` : ""].filter(Boolean).join("\n\n");
    })
    .filter(Boolean);
  return normalizeText(sections.join("\n\n"));
}

export const importLimits = {
  maxUploadBytes: MAX_UPLOAD_BYTES,
  maxExtractedCharacters: MAX_EXTRACTED_CHARACTERS,
  maxPdfPages: MAX_PDF_PAGES,
  maxPptxSlides: MAX_PPTX_SLIDES,
};
