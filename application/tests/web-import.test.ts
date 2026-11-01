import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { composeSlideText, extractDocument } from "../lib/document-import.web";

async function browserPptx(): Promise<Blob> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types />");
  zip.file("ppt/presentation.xml", `<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId r:id="rId1" /></p:sldIdLst></p:presentation>`);
  zip.file("ppt/_rels/presentation.xml.rels", `<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml" /></Relationships>`);
  zip.file("ppt/slides/slide1.xml", `<p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:nvPr><p:ph type="title" /></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>Web title</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:txBody><a:p><a:r><a:t>Web body</a:t></a:r></a:p><a:p><a:pPr><a:buChar char="•" /></a:pPr><a:r><a:t>Browser bullet</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`);
  return new Blob([await zip.generateAsync({ type: "arraybuffer" })], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
}

describe("static web document import", () => {
  it("reads local TXT without a server", async () => {
    const document = await extractDocument({ uri: "blob:txt", name: "speech.txt", file: new Blob(["Opening\n\nClosing"], { type: "text/plain" }) });
    expect(document).toMatchObject({ sourceFormat: "txt", text: "Opening\n\nClosing" });
  });

  it("parses PPTX title, body and bullets locally for the HostGator build", async () => {
    const document = await extractDocument({ uri: "blob:pptx", name: "deck.pptx", file: await browserPptx() });
    expect(document.slides?.[0]).toMatchObject({ number: 1, title: "Web title", text: "Web body\n• Browser bullet" });
    expect(composeSlideText(document.slides ?? [], "slides")).toBe("Web title\nWeb body\n• Browser bullet");
  });
});
