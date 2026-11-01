export type ImportSourceFormat = "txt" | "pdf" | "docx" | "pptx";

export type ImportedSlide = {
  id: string;
  number: number;
  title: string;
  text: string;
  speakerNotes: string;
};

export type ImportedDocument = {
  sourceFormat: ImportSourceFormat;
  sourceFilename: string;
  extractionWarnings: string[];
  text: string;
  slides?: ImportedSlide[];
};

export type ImportFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  /** Web document pickers supply the original browser File here. */
  file?: File | Blob | null;
};

export type SlideImportChoice = "slides+notes" | "slides" | "notes";

export declare const IMPORT_MAX_FILE_BYTES: number;
export declare const IMPORT_MAX_EXTRACTED_CHARACTERS: number;
export declare const IMPORT_MAX_PDF_PAGES: number;
export declare const IMPORT_MAX_PPTX_SLIDES: number;

export declare function extractDocument(file: ImportFile): Promise<ImportedDocument>;
export declare function composeSlideText(slides: ImportedSlide[], choice: SlideImportChoice): string;
