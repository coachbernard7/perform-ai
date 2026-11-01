import JSZip from "jszip";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  buildScriptText,
  extractDocument,
  ImportExtractionError,
  MAX_EXTRACTED_CHARACTERS,
  MAX_UPLOAD_BYTES,
} from "../server/import/extract";

async function makePptx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\" />");
  zip.file("ppt/presentation.xml", `
    <p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst>
      <p:sldId id="256" r:id="rId2" />
      <p:sldId id="257" r:id="rId1" />
    </p:sldIdLst></p:presentation>`);
  zip.file("ppt/_rels/presentation.xml.rels", `
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml" />
      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml" />
    </Relationships>`);
  zip.file("ppt/slides/slide1.xml", `
    <p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree>
      <p:sp><p:nvSpPr><p:nvPr><p:ph type="title" /></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>First title</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>First body</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree></p:cSld></p:sld>`);
  zip.file("ppt/slides/slide2.xml", `
    <p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree>
      <p:sp><p:nvSpPr><p:nvPr><p:ph type="ctrTitle" /></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>Second title</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>Second body</a:t></a:r></a:p><a:p><a:pPr><a:buChar char="•" /></a:pPr><a:r><a:t>Second point</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree></p:cSld></p:sld>`);
  zip.file("ppt/slides/_rels/slide1.xml.rels", `
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide1.xml" />
    </Relationships>`);
  zip.file("ppt/slides/_rels/slide2.xml.rels", `
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide2.xml" />
    </Relationships>`);
  zip.file("ppt/notesSlides/notesSlide1.xml", `
    <p:notes xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree>
      <p:sp><p:nvSpPr><p:nvPr><p:ph type="body" /></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>First speaker note</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree></p:cSld></p:notes>`);
  zip.file("ppt/notesSlides/notesSlide2.xml", `
    <p:notes xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree>
      <p:sp><p:nvSpPr><p:nvPr><p:ph type="body" /></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>Second speaker note</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree></p:cSld></p:notes>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

async function makeDocx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Opening paragraph</w:t></w:r></w:p><w:p><w:r><w:t>Closing paragraph</w:t></w:r></w:p></w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("document import extraction", () => {
  it("normalizes a UTF-8 text upload and records its source", async () => {
    const document = await extractDocument("opening.txt", Buffer.from("\uFEFFHello\r\n\r\n\r\nWorld  \n"));
    expect(document).toMatchObject({ sourceFormat: "txt", sourceFilename: "opening.txt", text: "Hello\n\nWorld", extractionWarnings: [] });
  });

  it("extracts PowerPoint slides in presentation order with separate titles, bullets, and notes", async () => {
    const document = await extractDocument("deck.pptx", await makePptx());
    expect(document.sourceFormat).toBe("pptx");
    expect(document.slides).toEqual([
      expect.objectContaining({ number: 1, title: "Second title", text: "Second body\n• Second point", speakerNotes: "Second speaker note" }),
      expect.objectContaining({ number: 2, title: "First title", text: "First body", speakerNotes: "First speaker note" }),
    ]);
    expect(buildScriptText(document.slides ?? [], "notes")).toBe("Second speaker note\n\nFirst speaker note");
    expect(buildScriptText(document.slides ?? [], "slides")).toContain("Second title\nSecond body\n• Second point");
    expect(buildScriptText(document.slides ?? [], "slides")).not.toContain("Second title\nSecond title");
    expect(buildScriptText(document.slides ?? [], "slides+notes")).toContain("Speaker notes:\nFirst speaker note");
  });

  it("extracts text from generated DOCX and text-layer PDF fixtures", async () => {
    const docx = await extractDocument("speech.docx", await makeDocx());
    expect(docx).toMatchObject({ sourceFormat: "docx", text: "Opening paragraph\n\nClosing paragraph" });

    const fixturePath = fileURLToPath(new URL("./fixtures/sample-pdf.pdf", import.meta.url));
    const pdf = await extractDocument("speech.pdf", readFileSync(fixturePath));
    expect(pdf).toMatchObject({ sourceFormat: "pdf" });
    expect(pdf.text).toContain("Hello rehearsal PDF");
  });

  it("enforces byte and extracted-text limits and rejects unsupported file extensions", async () => {
    await expect(extractDocument("too-large.txt", Buffer.alloc(MAX_UPLOAD_BYTES + 1, 65))).rejects.toMatchObject({ status: 413 });
    await expect(extractDocument("huge.txt", Buffer.from("x".repeat(MAX_EXTRACTED_CHARACTERS + 1)))).rejects.toBeInstanceOf(ImportExtractionError);
    await expect(extractDocument("unsupported.rtf", Buffer.from("text"))).rejects.toMatchObject({ message: "Choose a TXT, PDF, DOCX, or PPTX file." });
  });
});
