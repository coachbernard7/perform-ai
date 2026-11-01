import type { Express, NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";

import { extractDocument, ImportExtractionError, MAX_UPLOAD_BYTES } from "./extract";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 4,
    parts: 5,
  },
  fileFilter: (_request, file, callback) => {
    if (file.fieldname !== "file") {
      callback(new ImportExtractionError("Use the multipart field named file.") as never);
      return;
    }
    callback(null, true);
  },
});

const importWindows = new Map<string, number[]>();

function isRateLimited(request: Request): boolean {
  const key = request.ip || request.socket.remoteAddress || "unknown";
  const now = Date.now();
  const recent = (importWindows.get(key) ?? []).filter((timestamp) => timestamp > now - 60 * 60 * 1000);
  if (recent.length >= 20) return true;
  recent.push(now);
  importWindows.set(key, recent);
  return false;
}

function limitImport(request: Request, response: Response, next: NextFunction): void {
  if (isRateLimited(request)) {
    response.status(429).json({ error: "Too many document imports. Please wait before trying again." });
    return;
  }
  next();
}

function handleUpload(request: Request, response: Response, next: NextFunction): void {
  upload.single("file")(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof MulterError) {
      const message = error.code === "LIMIT_FILE_SIZE"
        ? `Files must be ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB or smaller.`
        : "The upload did not meet the import limits.";
      response.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: message });
      return;
    }
    if (error instanceof ImportExtractionError) {
      response.status(error.status).json({ error: error.message });
      return;
    }
    response.status(400).json({ error: "The file upload could not be processed." });
  });
}

export function registerImportRoutes(app: Express): void {
  app.post("/api/import/extract", limitImport, handleUpload, async (request, response) => {
    try {
      if (!request.file) {
        response.status(400).json({ error: "Attach one document using the multipart field named file." });
        return;
      }
      const extracted = await extractDocument(request.file.originalname, request.file.buffer);
      response.json(extracted);
    } catch (error) {
      if (error instanceof ImportExtractionError) {
        response.status(error.status).json({ error: error.message });
        return;
      }
      console.error("[import] extraction failed", error);
      response.status(500).json({ error: "The document could not be extracted." });
    }
  });
}
