/* resolutions.js — Board Resolution Library: metadata, filename convention, content search and matching. */
var categories = [{ id: "supplier", label: "Supplier/Contractor/Service Provider Engagement" }, { id: "dividend", label: "Dividend Declaration" }, { id: "asset", label: "Sale/Transfer of Company Asset" }, { id: "writeoff", label: "Write-Off Authorization" }, { id: "authority", label: "Authority to Sign or Act for the Company" }];
var categoryLabel = (id) => categories.find((c3) => c3.id === id)?.label || "Category unverified";
var seeds = [];
var KEY2 = "nb.legal.resolutions.v1";
async function initializeResolutions() {
  const response = await fetch("resolutions/library.json");
  if (!response.ok) throw new Error("Resolution library unavailable.");
  seeds = await response.json();
}
function resolutions() {
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem(KEY2) || "[]");
  } catch {
  }
  return [...new Map([...seeds, ...saved].map((r3) => [r3.id, r3])).values()];
}
var resolutionBy = (id) => resolutions().find((r3) => r3.id === id);
var validDate = (d3) => /^\d{4}-\d{2}-\d{2}$/.test(d3 || "") && !Number.isNaN(Date.parse(d3)) && new Date(d3).toISOString().slice(0, 10) === d3;
function proposedFilename(r3) {
  const subject = (r3.subject || "SUBJECT-UNVERIFIED").normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase().slice(0, 90);
  return `${r3.company || "COMPANY-UNVERIFIED"}_BR_${validDate(r3.resolutionDate) ? r3.resolutionDate : "DATE-UNVERIFIED"}_${subject}.docx`;
}
var normalize = (s3) => String(s3 || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
var tokens = (s3) => [...new Set(normalize(s3).split(" ").filter((t3) => t3.length > 2 && !["the", "and", "for", "with", "company", "request", "certificate", "please", "sign", "act"].includes(t3)))];
function matchResolutions(values, rows = resolutions()) {
  const code = String(values.companyCode || values.company || "").trim().toUpperCase();
  const query = tokens([values.context || values.purpose || "", values.requestedAction, values.requestCounterparty].filter(Boolean).join(" "));
  const matches = rows.filter((r3) => r3.company === code).map((r3) => {
    const content = normalize(r3.sourceText), subject = normalize(r3.subject), purpose = normalize(r3.transactionPurpose), persons = normalize((r3.persons || []).join(" "));
    const hits = query.filter((t3) => content.includes(t3) || subject.includes(t3) || purpose.includes(t3) || persons.includes(t3));
    const sameCategory = r3.category === values.resolutionCategory;
    const score = (sameCategory ? 100 : 0) + hits.reduce((n3, t3) => n3 + (subject.includes(t3) ? 5 : 0) + (purpose.includes(t3) ? 4 : 0) + (persons.includes(t3) ? 6 : 0) + (content.includes(t3) ? 2 : 0), 0);
    return { resolution: r3, score, hits, sameCategory };
  }).filter((m3) => m3.sameCategory || m3.hits.length).sort((a3, b3) => b3.score - a3.score || a3.resolution.id.localeCompare(b3.resolution.id));
  const ambiguous = matches.length > 1 && matches[0].score - matches[1].score < 10;
  return { matches: matches.slice(0, 5), ambiguous, unmatched: matches.length === 0 };
}
function saveResolution(id, changes, verified = false) {
  requireView("assistant", "manager");
  const existing = resolutionBy(id);
  if (!existing) throw new Error("Resolution not found.");
  const row = { ...existing, ...changes, company: String(changes.company || existing.company).trim().toUpperCase() };
  if (!/^[A-Z][A-Z0-9]{1,11}$/.test(row.company)) throw new Error("Enter a valid company abbreviation.");
  if (row.resolutionDate && !validDate(row.resolutionDate)) throw new Error("Enter a valid resolution date or leave it unverified.");
  if (!categories.some((c3) => c3.id === row.category)) throw new Error("Select a resolution category.");
  if (verified && (!row.subject.trim() || !row.clauses.trim() || !row.sourceText.trim())) throw new Error("Verify the subject and actual source clauses before marking metadata verified.");
  if (row.sourceUrl && !/^https:\/\//i.test(row.sourceUrl)) throw new Error("Use an HTTPS SharePoint source URL.");
  for (const key of ["actionSourceText", "counterpartySourceText"]) if (row[key] && !row.clauses.includes(row[key])) throw new Error("The variable source text must be copied exactly from the resolution clauses.");
  row.metadataStatus = verified ? "Verified by Legal" : "Needs Legal verification";
  row.version = (existing.version || 1) + 1;
  row.verifiedAt = verified ? (/* @__PURE__ */ new Date()).toISOString() : null;
  row.verifiedBy = verified ? "Legal (prototype role)" : null;
  row.audit = [...existing.audit || [], { action: verified ? "Metadata verified" : "Metadata corrected", at: (/* @__PURE__ */ new Date()).toISOString() }];
  const saved = resolutions().filter((r3) => r3.id !== id);
  saved.push(row);
  localStorage.setItem(KEY2, JSON.stringify(saved));
  return row;
}
function extractMetadata(text2, filename = "") {
  const company = (filename.match(/\b(HMC|NCFI|KAS|SMI|AFI|NBH)\b/i) || text2.match(/\b([A-Z]{2,12})\s+(?:BR)\b/))?.[1]?.toUpperCase() || "";
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const dateMatch = text2.match(/(?:RESOLUTION DATED|resolutions? on)\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
  let date3 = "";
  if (dateMatch) {
    const month = months.indexOf(dateMatch[1].toLowerCase()) + 1;
    date3 = `${dateMatch[3]}-${String(month).padStart(2, "0")}-${dateMatch[2].padStart(2, "0")}`;
    if (!validDate(date3)) date3 = "";
  }
  const number = text2.match(/(?:[A-Z]{2,12}\s+(?:BR)|SPECIAL BOARD RESOLUTION\s+No\.)\s*\d{4}\s*[–-]\s*\d{2}\s*[–-]\s*\d{2}/i)?.[0] || "";
  const start = text2.search(/[“"']?RESOLVED,/);
  const end = text2.indexOf("IN WITNESS WHEREOF", start);
  const companyName = text2.match(/(?:members|stock) of\s+(.+?)(?=,?\s*\(|\n)/i)?.[1] || "";
  const companyAddress = text2.match(/(?:principal office address at|business address at|its address at)\s+(.+?)(?=,?\s*to wit|,?\s*adopted|\n)/i)?.[1] || "";
  const governingBody = /Board of Trustees/i.test(text2) ? "Board of Trustees" : /Board of Directors/i.test(text2) ? "Board of Directors" : "";
  const president = sourcePresident({ sourceText: text2 });
  return { company, companyName, companyAddress, governingBody, presidentName: president.name, presidentEvidence: president.evidence, resolutionDate: date3, resolutionNumber: number, subject: "", category: "authority", dateEvidence: dateMatch?.[0] || "Date could not be established from contents.", clauses: start >= 0 ? text2.slice(start, end > start ? end : void 0).trim() : "" };
}
async function importResolution(file) {
  requireView("assistant", "manager");
  if (!file || !file.name.toLowerCase().endsWith(".docx")) throw new Error("Upload an original DOCX resolution. PDF/OCR ingestion is not configured.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Use a DOCX under 2 MB.");
  const bytes2 = new Uint8Array(await file.arrayBuffer()), zip = fflate.unzipSync(bytes2);
  if (!zip["word/document.xml"]) throw new Error("The file is not a valid Word document.");
  const xml = new DOMParser().parseFromString(fflate.strFromU8(zip["word/document.xml"]), "application/xml");
  const W3 = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const text2 = [...xml.getElementsByTagNameNS(W3, "p")].map((p3) => [...p3.getElementsByTagNameNS(W3, "t")].map((t3) => t3.textContent).join("")).join("\n");
  let binary = "";
  for (const b3 of bytes2) binary += String.fromCharCode(b3);
  const row = { id: "br-upload-" + crypto.randomUUID(), ...extractMetadata(text2, file.name), sourceText: text2, originalFilename: file.name, originalData: btoa(binary), sourceUrl: "", sourceReference: "Local upload; SharePoint source not configured", metadataStatus: "Needs Legal verification", version: 1, importedAt: (/* @__PURE__ */ new Date()).toISOString() };
  const saved = resolutions();
  saved.push(row);
  localStorage.setItem(KEY2, JSON.stringify(saved));
  return row;
}
function resolutionSnapshot(r3) {
  const president = sourcePresident(r3);
  return { ...structuredClone(r3), presidentName: president.name, presidentEvidence: president.evidence };
}
function linkedValues(values, r3) {
  return { ...values, documentCategory: "Secretary\u2019s Certificate", companyCode: r3.company, legalCompanyName: r3.companyName || values.legalCompanyName || "", companyAddress: r3.companyAddress || values.companyAddress || "", presidentName: sourcePresident(r3).name, ...requestVariableValues(values, r3), boardDate: r3.resolutionDate || "", governingBody: r3.governingBody || "", resolutionNumber: r3.resolutionNumber || "" };
}
async function linkResolution(request, id, actor = "Requestor") {
  const r3 = resolutionBy(id);
  if (!r3 || r3.company !== request.values.companyCode) throw new Error("Select a resolution belonging to this company.");
  if (!r3.clauses.trim()) throw new Error("Source clauses are missing; Legal must review the source first.");
  return updateResolutionLink(request, resolutionSnapshot(r3), linkedValues(request.values, r3), actor);
}
function validateResolutionRequest(r3) {
  if (!r3.resolutionWorkflow) return;
  if (!r3.resolutionSnapshot || !r3.resolutionConfirmed) throw new Error("Confirm the source resolution before sending or approving.");
  if (r3.resolutionSnapshot.company !== r3.values.companyCode) throw new Error("The source resolution belongs to a different company.");
  if (r3.resolutionSnapshot.metadataStatus !== "Verified by Legal") throw new Error("Legal must verify the resolution metadata in the Board Resolution Library and apply it to this request.");
  if (!validDate(r3.resolutionSnapshot.resolutionDate)) throw new Error("The resolution date is unverified. Legal must establish it from evidence before approval.");
  if (r3.values.boardDate !== r3.resolutionSnapshot.resolutionDate) throw new Error("The certificate date must match the verified source resolution date. Apply the correct library metadata first.");
  if (r3.values.governingBody !== r3.resolutionSnapshot.governingBody) throw new Error("The certificate governing body must match the verified source.");
  if (!sourcePresident(r3.resolutionSnapshot).name) throw new Error("The President is not clearly identified in the selected Board Resolution. Legal must verify a source that identifies the President.");
  const variableFields = resolutionVariableFields(r3.resolutionSnapshot), variableValues = requestVariableValues(r3.values, r3.resolutionSnapshot);
  if (variableFields.action && !String(variableValues.requestedAction).trim()) throw new Error("Enter the requested action before approval.");
  if (variableFields.counterparty && !String(variableValues.requestCounterparty).trim()) throw new Error("Enter the agency / counterparty before approval.");
  if (!r3.sourceVerification) throw new Error("The Legal Assistant must verify that the draft preserves the source resolution before sending it to the Manager.");
  if (r3.documentTemplate !== "custom") throw new Error("Use the supplied certificate shell for source-resolution requests.");
}
