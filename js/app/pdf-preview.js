/* pdf-preview.js — Renders PDF previews with pdf.js. */
var renderer;
async function loadRenderer() {
  if (!renderer) renderer = Promise.all([Promise.resolve().then(() => (init_pdf_min(), pdf_min_exports)), Promise.resolve().then(() => (init_pdf_worker_min(), pdf_worker_min_exports))]).then(([pdfjs, worker]) => {
    globalThis.pdfjsWorker = worker;
    return pdfjs;
  });
  return renderer;
}
async function renderPDFPages(blob, target, isCurrent = () => true) {
  const pdfjs = await loadRenderer();
  if (!isCurrent()) return;
  const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), disableFontFace: true, useSystemFonts: false, isEvalSupported: false });
  let pdf;
  try {
    pdf = await task.promise;
    if (!isCurrent()) return;
    target.replaceChildren();
    const status = document.createElement("p");
    status.className = "pdf-preview-status";
    status.setAttribute("role", "status");
    status.textContent = `${pdf.numPages} ${pdf.numPages === 1 ? "page" : "pages"}`;
    target.append(status);
    for (let i3 = 1; i3 <= pdf.numPages; i3++) {
      if (!isCurrent()) return;
      const page = await pdf.getPage(i3), base = page.getViewport({ scale: 1 });
      const section2 = document.createElement("section");
      section2.className = "pdf-preview-page";
      section2.setAttribute("aria-label", `Document page ${i3} of ${pdf.numPages}`);
      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-label", `Page ${i3}`);
      canvas.setAttribute("role", "img");
      const viewport = page.getViewport({ scale: 1.6 });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.aspectRatio = `${base.width} / ${base.height}`;
      section2.append(canvas);
      target.append(section2);
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const content = await page.getTextContent();
      const accessible = document.createElement("details");
      accessible.className = "pdf-page-text";
      const summary = document.createElement("summary");
      summary.textContent = `Read page ${i3} text`;
      const text2 = document.createElement("p");
      text2.textContent = content.items.map((item) => item.str + (item.hasEOL ? "\n" : " ")).join("");
      accessible.append(summary, text2);
      section2.append(accessible);
      page.cleanup();
    }
    status.textContent = `${pdf.numPages} ${pdf.numPages === 1 ? "page" : "pages"} \xB7 PDF preview`;
  } finally {
    if (pdf) await pdf.destroy();
    else await task.destroy();
  }
}
