/* pdf.js — Builds the PDF output with pdf-lib. */
var pdfFilename = (r3) => documentFilename(r3).replace(/\.docx$/, ".pdf");
async function createPDF(r3) {
  return (await renderTemplatePDF(r3)).blob;
}
async function downloadPDF(r3) {
  const blob = r3.templateVersion === "2026-10-05" ? r3.finalPDF || await createPDF(r3) : await createPDF(r3);
  const url = URL.createObjectURL(blob), a3 = document.createElement("a");
  a3.href = url;
  a3.download = pdfFilename(r3);
  a3.click();
  setTimeout(() => URL.revokeObjectURL(url), 2e3);
}
