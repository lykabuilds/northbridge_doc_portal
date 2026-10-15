/* data.js — Three sample requests built from the library. */
var now = Date.now();
var ago = (d3) => new Date(now - d3 * 864e5).toISOString();
var samples = [];
function initializeWorkflowSamples() {
  samples = resolutions().filter((r3) => ["br-hmc", "br-smi", "br-afi"].includes(r3.id)).map((source, index) => ({ id: `LR-2026-${String(201 + index).padStart(4, "0")}`, type: "certificate", date: ago(index + 2), stageEnteredAt: ago(index + 1), status: index === 0 ? "For Legal Review" : index === 1 ? "Submitted" : "For Clarification", approvalState: index === 0 ? "For Approval" : index === 1 ? "Assistant Review" : "For Revision", sample: true, workflowExample: true, requesterProfile: "current", resolutionWorkflow: true, resolutionConfirmed: true, matchState: "Confirmed", resolutionSnapshot: resolutionSnapshot(source), sourceVerification: index === 0, ...index === 0 ? { sourceVerifiedVersion: 1 } : {}, documentTemplate: "custom", documentBody: source.clauses, scn: null, displayType: categoryLabel(source.category), comments: index === 2 ? "Please confirm whether this certificate is for the BIR change-of-address filing at RDO 047, or for a different BIR transaction." : "", values: linkedValues({ requestor: ["Sample Crewing requester", "Sample Treasury requester", "Sample Finance requester"][index], company: source.companyName, companyCode: source.company, neededBy: new Date(now + 7 * 864e5).toISOString().slice(0, 10), resolutionCategory: source.category, context: source.subject, purpose: source.subject, ...index === 0 ? { executionDate: new Date(now).toISOString().slice(0, 10), executionCity: "Pasay City" } : {} }, source) }));
}
var KEY3 = "nb.legal.requests.v1";
var DRAFT = "nb.legal.draft.v1";
function legacyRequests() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY3) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}
function clearLegacyRequests() {
  try {
    localStorage.removeItem(KEY3);
  } catch {
  }
}
function getRequests() {
  const merged = new Map(samples.map((r3) => [r3.id, overrideRequest(r3)]));
  for (const r3 of persistedRequests()) if (!r3.sample || samples.some((s3) => s3.id === r3.id)) merged.set(r3.id, r3);
  return [...merged.values()];
}
function saveDraft(draft2) {
  try {
    localStorage.setItem(DRAFT, JSON.stringify(draft2));
  } catch {
  }
}
function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT) || "null");
  } catch {
    return null;
  }
}
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT);
  } catch {
  }
}
