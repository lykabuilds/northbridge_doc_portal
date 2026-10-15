/* documents.js — Builds the Word (.docx) output. */
function documentTitle(r3) {
  return r3.values.documentCategory || (r3.type === "asset" ? "Deed of Absolute Sale" : r3.type === "other" ? "Legal Document" : r3.type === "board" ? "Board Resolution" : "Secretary\u2019s Certificate");
}
function documentFilename(r3, approved = r3.approvalState === "Approved") {
  const stem = isCertificate(r3) ? scnPreview(r3).replaceAll(" ", "_") : `${companyCode(r3) || "COMPANY"}_${r3.id}_${documentTitle(r3).replace(/[^a-zA-Z0-9]+/g, "_")}`;
  const department = String(r3.values.department || "").replace(/[^a-zA-Z0-9]+/g, "_");
  return department ? `${stem}_${department}_${r3.id}_${approved ? "APPROVED" : "DRAFT"}.docx` : `${stem}_${approved ? "APPROVED" : "DRAFT"}.docx`;
}
function documentBodyText(r3) {
  return templateResolutionText(r3);
}
async function createDocx(r3, approved = r3.approvalState === "Approved") {
  if (approved && isCertificate(r3) && !r3.scn) throw new Error("An approved certificate requires its reserved SC number.");
  const layout = await renderTemplatePDF(r3);
  return templateDocx(r3, layout.pageCount);
}
var encoder = new TextEncoder();
async function downloadDocx(r3) {
  const blob = r3.templateVersion === "2026-10-05" ? r3.finalDocument || await createDocx(r3) : await createDocx(r3);
  const url = URL.createObjectURL(blob);
  const a3 = document.createElement("a");
  a3.href = url;
  a3.download = documentFilename(r3);
  a3.click();
  setTimeout(() => URL.revokeObjectURL(url), 2e3);
}
