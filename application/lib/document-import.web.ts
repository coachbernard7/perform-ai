import JSZip from "jszip";
import mammoth from "mammoth/mammoth.browser";
import { XMLParser } from "fast-xml-parser";
import { performBasePath } from "./hosting";

import type { ImportedDocument, ImportedSlide, ImportFile, SlideImportChoice } from "./document-import";

export const IMPORT_MAX_FILE_BYTES = 15 * 1024 * 1024;
export const IMPORT_MAX_EXTRACTED_CHARACTERS = 200_000;
export const IMPORT_MAX_PDF_PAGES = 100;
export const IMPORT_MAX_PPTX_SLIDES = 200;
const MAX_ZIP_ENTRIES = 1_500;
const MAX_ZIP_UNCOMPRESSED_BYTES = 60 * 1024 * 1024;
const MAX_ZIP_ENTRY_BYTES = 12 * 1024 * 1024;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: false,
  parseTagValue: false,
});

type BrowserFile = Blob & { name?: string };
type ZipFile = { dir: boolean; unsafeOriginalName?: string; _data?: { uncompressedSize?: number }; async(type: "string"): Promise<string> };

function normalizeText(value: string): string {
  return value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function assertText(value: string, label: string): string {
  const text = normalizeText(value);
  if (!text) throw new Error(`No readable text was found in this ${label}.`);
  if (text.length > IMPORT_MAX_EXTRACTED_CHARACTERS) {
    throw new Error(`This ${label} contains more than ${IMPORT_MAX_EXTRACTED_CHARACTERS.toLocaleString()} characters of text.`);
  }
  return text;
}

function sourceFormat(name: string): ImportedDocument["sourceFormat"] {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "txt" || extension === "pdf" || extension === "docx" || extension === "pptx") return extension;
  throw new Error("Choose a TXT, PDF, DOCX, or PPTX file.");
}

function toFile(input: ImportFile): BrowserFile {
  if (input.file instanceof Blob) return input.file as BrowserFile;
  throw new Error("Your browser did not provide the selected file. Please choose it again.");
}

function asArray<T>(value: T | T[] | undefined): T[] {
  return value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
}

function collectText(node: unknown): string[] {
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  if (!node || typeof node !== "object") return [];
  const values: string[] = [];
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "a:t") asArray(value).forEach((item) => values.push(...collectText(item)));
    else if (!key.startsWith("@_")) values.push(...collectText(value));
  }
  return values;
}

function nodeText(node: unknown): string {
  return normalizeText(collectText(node).join(" "));
}

function resolvePartPath(fromPart: string, target: string): string {
  const output: string[] = [];
  for (const part of `${fromPart.substring(0, fromPart.lastIndexOf("/") + 1)}${target}`.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!output.length) throw new Error("The presentation contains an unsafe internal file path.");
      output.pop();
    } else output.push(part);
  }
  return output.join("/");
}

function relationshipPartPath(partPath: string): string {
  const slash = partPath.lastIndexOf("/");
  return `${partPath.slice(0, slash)}/_rels/${partPath.slice(slash + 1)}.rels`;
}

function relationMap(xml: string, fromPart: string): Map<string, { type: string; target: string }> {
  const parsed = xmlParser.parse(xml) as Record<string, any>;
  const map = new Map<string, { type: string; target: string }>();
  for (const relation of asArray(parsed?.Relationships?.Relationship)) {
    const id = relation?.["@_Id"];
    const target = relation?.["@_Target"];
    const type = relation?.["@_Type"];
    if (typeof id === "string" && typeof target === "string" && typeof type === "string" && relation?.["@_TargetMode"] !== "External") {
      map.set(id, { type, target: resolvePartPath(fromPart, target) });
    }
  }
  return map;
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
  const value = asArray(shape?.["p:nvSpPr"]?.["p:nvPr"]?.["p:ph"])[0];
  return typeof value?.["@_type"] === "string" ? value["@_type"] : undefined;
}

function shapeText(shape: Record<string, any>): string {
  const paragraphs = asArray(shape?.["p:txBody"]?.["a:p"]);
  if (!paragraphs.length) return nodeText(shape?.["p:txBody"]);
  return normalizeText(paragraphs.map((paragraph) => {
    const text = normalizeText(collectText(paragraph).join(" "));
    if (!text) return "";
    const properties = paragraph?.["a:pPr"];
    return properties?.["a:buChar"] || properties?.["a:buAutoNum"] ? `• ${text}` : text;
  }).filter(Boolean).join("\n"));
}

function slideParts(root: Record<string, any>): { title: string; text: string } {
  const shapes = getShapes(root);
  const titleShape = shapes.find((shape) => ["title", "ctrTitle"].includes(placeholderType(shape) ?? ""));
  const title = titleShape ? shapeText(titleShape) : "";
  const bodyShapes = titleShape ? shapes.filter((shape) => shape !== titleShape) : shapes;
  let text = normalizeText(bodyShapes.map(shapeText).filter(Boolean).join("\n"));
  const fallbackTitle = text.split("\n").find(Boolean)?.replace(/^•\s*/, "").slice(0, 140) || "Untitled slide";
  if (!titleShape && text) text = normalizeText(text.split("\n").slice(1).join("\n")) || text;
  return { title: title || fallbackTitle, text };
}

function notesText(root: Record<string, any>): string {
  const body = normalizeText(getShapes(root).filter((shape) => placeholderType(shape) === "body").map(shapeText).filter(Boolean).join("\n\n"));
  return body || nodeText(root);
}

function inspectZip(zip: JSZip): void {
  const files = Object.entries(zip.files) as [string, ZipFile][];
  if (files.length > MAX_ZIP_ENTRIES) throw new Error("This Office document has too many internal files to import safely.");
  let total = 0;
  for (const [name, file] of files) {
    if ((file.unsafeOriginalName ?? name).split("/").includes("..")) throw new Error("The Office document contains an unsafe internal file path.");
    const size = file._data?.uncompressedSize;
    if (typeof size === "number") {
      if (size > MAX_ZIP_ENTRY_BYTES) throw new Error("This Office document contains an internal file that is too large to import safely.");
      total += size;
      if (total > MAX_ZIP_UNCOMPRESSED_BYTES) throw new Error("This Office document expands to too much data to import safely.");
    }
  }
}

async function loadZip(file: BrowserFile, label: string): Promise<JSZip> {
  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer(), { checkCRC32: false, createFolders: false });
    inspectZip(zip);
    return zip;
  } catch (error) {
    if (error instanceof Error && /too many|unsafe|too large|too much/.test(error.message)) throw error;
    throw new Error(`This file is not a valid ${label} document.`);
  }
}

async function zipText(zip: JSZip, partPath: string): Promise<string | undefined> {
  const file = zip.file(partPath);
  if (!file || file.dir) return undefined;
  const text = await file.async("string");
  if (text.length > MAX_ZIP_ENTRY_BYTES) throw new Error("The presentation contains an XML file that is too large to import safely.");
  return text;
}

async function extractPdf(file: BrowserFile): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = `${performBasePath}/pdf.worker.min.mjs`;
    const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
    const pdf = await loadingTask.promise;
    if (pdf.numPages > IMPORT_MAX_PDF_PAGES) {
      await pdf.destroy();
      throw new Error(`PDF files are limited to ${IMPORT_MAX_PDF_PAGES} pages.`);
    }
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => typeof item?.str === "string" ? item.str : "").filter(Boolean).join(" "));
      page.cleanup();
    }
    await pdf.destroy();
    return assertText(pages.join("\n\n"), "PDF");
  } catch (error) {
    if (error instanceof Error && /limited|No readable/.test(error.message)) throw error;
    throw new Error("This PDF could not be read. It may be encrypted, scanned, or malformed.");
  }
}

async function extractDocx(file: BrowserFile): Promise<{ text: string; warnings: string[] }> {
  await loadZip(file, "DOCX");
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { text: assertText(result.value, "DOCX"), warnings: result.messages.map((message) => message.message).filter(Boolean) };
  } catch (error) {
    if (error instanceof Error && /No readable|too many|unsafe|too large|too much/.test(error.message)) throw error;
    throw new Error("This DOCX file could not be read.");
  }
}

async function extractPptx(file: BrowserFile): Promise<{ text: string; slides: ImportedSlide[]; warnings: string[] }> {
  const zip = await loadZip(file, "PPTX");
  const presentationXml = await zipText(zip, "ppt/presentation.xml");
  const relationshipXml = await zipText(zip, "ppt/_rels/presentation.xml.rels");
  if (!presentationXml || !relationshipXml || !zip.file("[Content_Types].xml")) throw new Error("This file is not a complete PowerPoint presentation.");

  let presentation: Record<string, any>;
  try { presentation = xmlParser.parse(presentationXml) as Record<string, any>; } catch { throw new Error("The presentation XML could not be read."); }
  const relations = relationMap(relationshipXml, "ppt/presentation.xml");
  const ids = asArray(presentation?.["p:presentation"]?.["p:sldIdLst"]?.["p:sldId"]);
  if (!ids.length) throw new Error("No slides were found in this presentation.");
  if (ids.length > IMPORT_MAX_PPTX_SLIDES) throw new Error(`PowerPoint files are limited to ${IMPORT_MAX_PPTX_SLIDES} slides.`);

  const warnings: string[] = [];
  const slides: ImportedSlide[] = [];
  for (let index = 0; index < ids.length; index += 1) {
    const relation = relations.get(ids[index]?.["@_r:id"]);
    if (!relation || !/\/slide$/i.test(relation.type)) { warnings.push(`Slide ${index + 1} could not be located and was skipped.`); continue; }
    const slideXml = await zipText(zip, relation.target);
    if (!slideXml) { warnings.push(`Slide ${index + 1} could not be read and was skipped.`); continue; }
    try {
      const root = xmlParser.parse(slideXml) as Record<string, any>;
      const { title, text } = slideParts(root);
      let speakerNotes = "";
      const slideRelationshipsXml = await zipText(zip, relationshipPartPath(relation.target));
      if (slideRelationshipsXml) {
        const notesRelation = [...relationMap(slideRelationshipsXml, relation.target).values()].find((item) => /\/notesSlide$/i.test(item.type));
        if (notesRelation) {
          const notesXml = await zipText(zip, notesRelation.target);
          if (notesXml) speakerNotes = notesText(xmlParser.parse(notesXml) as Record<string, any>);
          else warnings.push(`Slide ${index + 1} has speaker notes that could not be read.`);
        }
      }
      slides.push({ id: `slide-${index + 1}`, number: index + 1, title, text, speakerNotes });
    } catch { warnings.push(`Slide ${index + 1} could not be parsed and was skipped.`); }
  }
  if (!slides.length) throw new Error("No readable slides were found in this presentation.");
  return { text: assertText(slides.map((slide) => [slide.title, slide.text, slide.speakerNotes].filter(Boolean).join("\n\n")).join("\n\n"), "PowerPoint presentation"), slides, warnings };
}

export function composeSlideText(slides: ImportedSlide[], choice: SlideImportChoice): string {
  return normalizeText(slides.map((slide) => {
    const slideText = [slide.title, slide.text].filter(Boolean).join("\n");
    if (choice === "slides") return slideText;
    if (choice === "notes") return slide.speakerNotes;
    return [slideText, slide.speakerNotes ? `Speaker notes:\n${slide.speakerNotes}` : ""].filter(Boolean).join("\n\n");
  }).filter(Boolean).join("\n\n"));
}

export async function extractDocument(input: ImportFile): Promise<ImportedDocument> {
  const file = toFile(input);
  if (file.size > IMPORT_MAX_FILE_BYTES) throw new Error("Files must be 15 MB or smaller.");
  const sourceFilename = input.name || file.name || "document";
  const format = sourceFormat(sourceFilename);
  if (format === "txt") return { sourceFormat: format, sourceFilename, text: assertText((await file.text()).replace(/^\uFEFF/, ""), "text file"), extractionWarnings: [] };
  if (format === "pdf") return { sourceFormat: format, sourceFilename, text: await extractPdf(file), extractionWarnings: [] };
  if (format === "docx") {
    const result = await extractDocx(file);
    return { sourceFormat: format, sourceFilename, ...result, extractionWarnings: result.warnings };
  }
  const result = await extractPptx(file);
  return { sourceFormat: format, sourceFilename, ...result, extractionWarnings: result.warnings };
}
