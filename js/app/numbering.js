/* numbering.js — Request store (IndexedDB), workflow transitions and SC numbering (one monthly sequence across companies). */
var dbPromise;
var cache = /* @__PURE__ */ new Map();
var registerCache = [];
var onChange = () => {
};
var channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("nb-legal-approval") : null;
function setApprovalChangeHandler(fn2) {
  onChange = fn2;
}
var isCertificate = (r3) => (r3.values.documentCategory || (r3.type === "asset" ? "Deed of Absolute Sale" : r3.type === "other" ? "Other Legal Document" : r3.type === "board" ? "Board Resolution" : "Secretary\u2019s Certificate")) === "Secretary\u2019s Certificate";
function submissionPeriod(r3) {
  const date3 = new Date(r3.date);
  if (Number.isNaN(date3.getTime())) throw new Error("A valid submission date is required.");
  const p3 = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Asia/Manila" }).formatToParts(date3);
  return { year: +p3.find((x3) => x3.type === "year").value, month: +p3.find((x3) => x3.type === "month").value };
}
function companyCode(r3) {
  const code = String(r3.values.companyCode || findCompany(r3.values)?.code || r3.values.company || "").trim().toUpperCase();
  return /^[A-Z][A-Z0-9]{1,11}$/.test(code) ? code : "";
}
var pad = (n3) => String(n3).padStart(2, "0");
function scnPreview(r3) {
  if (!isCertificate(r3)) return "Not Applicable";
  if (r3.scn) return r3.scn;
  const code = companyCode(r3);
  if (!code) return "PENDING SC NUMBER";
  const { year, month } = submissionPeriod(r3);
  return `${code}-SC-${year}-${pad(month)}-XXXX`;
}
function scnStatus(r3) {
  return !isCertificate(r3) ? "Not Applicable" : r3.scn || "Pending";
}
function nextSequence(rows, year, month) {
  const max = rows.filter((x3) => x3.year === year && x3.month === month && ["Reserved", "Approved", "Generated"].includes(x3.status)).reduce((n3, x3) => Math.max(n3, x3.sequence), 0);
  if (max >= 9999) throw new Error("The monthly four-digit sequence is full. Legal must configure an extension.");
  return max + 1;
}
function openDB() {
  if (!globalThis.indexedDB) return Promise.reject(new Error("This workflow requires browser storage."));
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const open = indexedDB.open("nb-legal-approval-v1", 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      const register = db.createObjectStore("register", { keyPath: "scnNumber" });
      register.createIndex("requestId", "requestId", { unique: true });
      db.createObjectStore("requests", { keyPath: "id" });
      db.createObjectStore("metadata", { keyPath: "key" });
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  return dbPromise;
}
async function hydrateApproval() {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(["register", "requests"], "readonly");
    const a3 = tx.objectStore("register").getAll(), b3 = tx.objectStore("requests").getAll();
    a3.onsuccess = () => registerCache = a3.result;
    b3.onsuccess = () => cache = new Map(b3.result.map((r3) => [r3.id, r3]));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
var overrideRequest = (r3) => cache.get(r3.id) || r3;
var persistedRequests = () => [...cache.values()];
var registerRecords = () => registerCache.slice().sort((a3, b3) => b3.year - a3.year || b3.month - a3.month || a3.sequence - b3.sequence || String(a3.approvalDate || "").localeCompare(String(b3.approvalDate || "")) || a3.requestId.localeCompare(b3.requestId));
function fixtureEntry(r3) {
  const m3 = r3.scn?.match(/^([A-Z0-9]+)-SC-(\d{4})-(\d{2})-(\d{4})$/);
  if (!m3) return null;
  return { scnNumber: r3.scn, companyCode: m3[1], companyName: r3.values.company, year: +m3[2], month: +m3[3], sequence: +m3[4], requestId: r3.id, requestType: r3.type, boardMeetingDate: r3.values.boardDate || null, approvalDate: r3.approvalDate || r3.date, legalApprover: "Legal Manager", generatedDocumentLink: "#document/" + r3.id, status: "Approved", sample: true };
}
async function seedRegister(samples2, legacy = []) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(["register", "requests", "metadata"], "readwrite");
    const register = tx.objectStore("register"), requests2 = tx.objectStore("requests"), meta = tx.objectStore("metadata");
    const seed = meta.get("workflow-v3");
    seed.onsuccess = () => {
      if (seed.result) return;
      const a3 = register.getAll(), b3 = requests2.getAll();
      let rows, stored;
      const prepare = () => {
        if (!rows || !stored) return;
        for (const r3 of rows) if (r3.sample) register.delete(r3.scnNumber);
        for (const r3 of stored) if (r3.sample) requests2.delete(r3.id);
        const merged = new Map(legacy.filter((r3) => !r3.sample).map((r3) => [r3.id, r3]));
        for (const r3 of stored.filter((r4) => !r4.sample)) merged.set(r3.id, r3);
        const fixtureIds = new Set(samples2.map((r3) => r3.id));
        const used = /* @__PURE__ */ new Set([...fixtureIds, ...[...merged.values()].filter((r3) => /^LR-\d{4}-\d{4}$/.test(r3.id) && !fixtureIds.has(r3.id)).map((r3) => r3.id)]);
        const mapping = /* @__PURE__ */ new Map();
        for (const r3 of [...merged.values()].sort((a4, b4) => new Date(a4.date) - new Date(b4.date))) {
          let id = r3.id;
          if (!/^LR-\d{4}-\d{4}$/.test(id) || fixtureIds.has(id)) {
            const year = submissionPeriod(r3).year;
            let n3 = 101;
            while (used.has(`LR-${year}-${String(n3).padStart(4, "0")}`)) n3++;
            id = `LR-${year}-${String(n3).padStart(4, "0")}`;
            used.add(id);
            mapping.set(r3.id, id);
            requests2.delete(r3.id);
          }
          requests2.put({ ...r3, id, status: r3.status === "Approved" ? "Document Ready" : r3.status === "Draft Generated" ? "Submitted" : r3.status === "For Revision" ? "For Clarification" : r3.status, stageEnteredAt: r3.stageEnteredAt || r3.approvalDate || r3.revisionDate || r3.date });
        }
        for (const r3 of rows.filter((r4) => !r4.sample)) if (mapping.has(r3.requestId)) register.put({ ...r3, requestId: mapping.get(r3.requestId), generatedDocumentLink: r3.generatedDocumentLink ? "#document/" + mapping.get(r3.requestId) : null });
        for (const r3 of samples2) {
          const entry = fixtureEntry(r3);
          if (entry && isCertificate(r3) && r3.approvalState === "Approved") register.put(entry);
        }
        meta.put({ key: "workflow-v3", value: true });
      };
      a3.onsuccess = () => {
        rows = a3.result;
        prepare();
      };
      b3.onsuccess = () => {
        stored = b3.result;
        prepare();
      };
    };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  await hydrateApproval();
}
async function createRequest(payload, known = []) {
  const db = await openDB();
  let result, error;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(["requests", "metadata"], "readwrite");
    const requests2 = tx.objectStore("requests"), meta = tx.objectStore("metadata");
    const all = requests2.getAll();
    all.onsuccess = () => {
      try {
        const now2 = (/* @__PURE__ */ new Date()).toISOString(), year = submissionPeriod({ date: now2 }).year;
        const max = [...known, ...all.result].reduce((n3, r3) => {
          const m3 = r3.id.match(/^LR-(\d{4})-(\d{4})$/);
          return m3 && +m3[1] === year ? Math.max(n3, +m3[2]) : n3;
        }, 100);
        const get = meta.get("request-counter-" + year);
        get.onsuccess = () => {
          const next = Math.max(max, get.result?.value || 100) + 1;
          if (next > 9999) {
            error = new Error("The annual request ID sequence is full.");
            tx.abort();
            return;
          }
          result = { ...payload, id: `LR-${year}-${String(next).padStart(4, "0")}`, date: now2, stageEnteredAt: now2, status: "Submitted", approvalState: "Assistant Review", scn: null, sample: false };
          requests2.add(result);
          meta.put({ key: "request-counter-" + year, value: next });
        };
      } catch (e7) {
        error = e7;
        tx.abort();
      }
    };
    tx.oncomplete = resolve;
    tx.onabort = () => reject(error || tx.error);
  });
  await hydrateApproval();
  channel?.postMessage({ id: result.id });
  return result;
}
async function atomic(request, mutate) {
  const db = await openDB();
  let result, error;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(["register", "requests"], "readwrite");
    const requests2 = tx.objectStore("requests"), register = tx.objectStore("register");
    const lookup = requests2.get(request.id);
    lookup.onsuccess = () => {
      const current = lookup.result || request, all = register.getAll();
      all.onsuccess = () => {
        try {
          result = mutate(current, all.result, register);
          requests2.put(result);
        } catch (e7) {
          error = e7;
          tx.abort();
        }
      };
    };
    tx.oncomplete = resolve;
    tx.onabort = () => reject(error || tx.error || new Error("The update could not be saved."));
    tx.onerror = () => {
      error = error || tx.error;
    };
  });
  await hydrateApproval();
  channel?.postMessage({ id: request.id });
  return result;
}
var stage = (r3, status, changes = {}) => ({ ...r3, ...changes, status, stageEnteredAt: status === r3.status ? r3.stageEnteredAt || r3.date : (/* @__PURE__ */ new Date()).toISOString() });
var audit = (r3, action, actor) => [...r3.audit || [], { action, actor, at: (/* @__PURE__ */ new Date()).toISOString() }];
async function sendToAssistant(request) {
  return atomic(request, (r3) => {
    if (["Approved", "Reserved", "Rejected"].includes(r3.approvalState)) throw new Error("This request cannot be sent for review.");
    return stage(r3, "For Legal Review", { approvalState: "Assistant Review", comments: "", audit: audit(r3, "Submitted to Legal Assistant", "Requester") });
  });
}
async function sendForApproval(request) {
  return atomic(request, (r3) => {
    if (["Approved", "Reserved", "Rejected"].includes(r3.approvalState)) throw new Error("This request cannot be sent for approval.");
    return stage(r3, "For Legal Review", { approvalState: "For Approval", sentForApprovalAt: (/* @__PURE__ */ new Date()).toISOString(), comments: "", audit: audit(r3, "Submitted to Legal Manager", "Legal Assistant") });
  });
}
async function amendDocument(request, body, actor) {
  if (!body.trim()) throw new Error("Document text cannot be empty.");
  return atomic(request, (r3) => {
    if (["Approved", "Reserved", "Rejected"].includes(r3.approvalState)) throw new Error("Approved documents are locked.");
    const status = actor === "Legal Assistant" ? "Processing" : r3.status;
    return stage(r3, status, { documentBody: r3.resolutionWorkflow ? bindDraftBody(body.trim(), r3.resolutionSnapshot, r3.values, r3.previousVariableValues) : body.trim(), ...r3.resolutionWorkflow ? { sourceVerification: false } : {}, documentVersion: (r3.documentVersion || 1) + 1, amendedBy: actor, amendedAt: (/* @__PURE__ */ new Date()).toISOString(), audit: audit(r3, "Document amended", actor) });
  });
}
async function updateTemplateFields(request, values, template, actor) {
  return atomic(request, (r3) => {
    if (["Approved", "Reserved", "Rejected"].includes(r3.approvalState)) throw new Error("Approved documents are locked.");
    return { ...r3, values: { ...r3.values, ...values }, ...r3.resolutionWorkflow ? { sourceVerification: false, previousVariableValues: requestVariableValues(r3.values, r3.resolutionSnapshot), documentBody: bindDraftBody(r3.documentBody || r3.resolutionSnapshot?.clauses || "", r3.resolutionSnapshot, r3.values) } : {}, ...template ? { documentTemplate: template } : {}, documentVersion: (r3.documentVersion || 1) + 1, audit: audit(r3, "Document template fields updated", actor) };
  });
}
async function updateResolutionLink(request, source, values, actor) {
  return atomic(request, (r3) => {
    if (["Approved", "Reserved", "Rejected"].includes(r3.approvalState)) throw new Error("Issued documents are locked.");
    if (source.company !== r3.values.companyCode) throw new Error("The resolution must belong to the request company.");
    return { ...r3, values, resolutionWorkflow: true, resolutionSnapshot: source, resolutionConfirmed: true, matchState: "Confirmed", documentTemplate: "custom", documentBody: source.clauses, sourceVerification: false, documentVersion: (r3.documentVersion || 1) + 1, audit: audit(r3, "Source resolution confirmed / applied", actor) };
  });
}
async function verifyResolutionDraft(request) {
  return atomic(request, (r3) => {
    if (["Approved", "Reserved", "Rejected"].includes(r3.approvalState)) throw new Error("Issued documents are locked.");
    if (!r3.resolutionSnapshot || r3.resolutionSnapshot.metadataStatus !== "Verified by Legal" || !r3.resolutionConfirmed) throw new Error("Verify library metadata and apply the updated source before verifying the draft.");
    if (!r3.resolutionSnapshot.resolutionDate) throw new Error("Establish the resolution date from evidence first.");
    return { ...r3, sourceVerification: true, sourceVerifiedVersion: r3.documentVersion || 1, audit: audit(r3, "Source and draft wording verified", "Legal (prototype)") };
  });
}
async function returnForRevision(request, comments) {
  if (!comments.trim()) throw new Error("Describe what the requester needs to clarify.");
  return atomic(request, (r3) => {
    if (["Approved", "Reserved", "Rejected"].includes(r3.approvalState)) throw new Error("This request cannot be returned.");
    return stage(r3, "For Clarification", { approvalState: "For Revision", comments: comments.trim(), audit: audit(r3, "Clarification requested", "Legal") });
  });
}
async function rejectRequest(request, comments) {
  if (!comments.trim()) throw new Error("Provide a rejection reason.");
  return atomic(request, (r3) => {
    if (r3.approvalState !== "For Approval") throw new Error("Only requests pending approval may be rejected.");
    return stage(r3, "Rejected", { approvalState: "Rejected", comments: comments.trim(), audit: audit(r3, "Rejected", "Legal Manager") });
  });
}
async function reviseRequest(request, values, attachments2, response = "") {
  return atomic(request, (r3) => {
    if (r3.approvalState !== "For Revision") throw new Error("Only requests returned for clarification may be edited.");
    return stage(r3, "For Legal Review", { values, attachments: attachments2 || r3.attachments, scn: null, approvalState: "Assistant Review", revisionDate: (/* @__PURE__ */ new Date()).toISOString(), requesterResponse: response || values.additional || "", documentBody: null, audit: audit(r3, "Clarification response submitted", "Requester") });
  });
}
async function respondToClarification(request, response) {
  if (!response.trim()) throw new Error("Enter your response before sending it to Legal.");
  return atomic(request, (r3) => {
    if (r3.status !== "For Clarification") throw new Error("This request does not require clarification.");
    return stage(r3, "For Legal Review", { approvalState: "Assistant Review", requesterResponse: response.trim(), comments: "", audit: audit(r3, "Clarification response submitted", "Requester") });
  });
}
async function reserveForApproval(request) {
  return atomic(request, (r3, rows, store) => {
    if (["Approved", "Reserved"].includes(r3.approvalState)) return r3;
    if (r3.approvalState !== "For Approval") throw new Error("Send this request to the Legal Manager before approval.");
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    let scn = null;
    if (isCertificate(r3)) {
      const code = companyCode(r3);
      if (!code) throw new Error("A valid company code is required.");
      const { year, month } = submissionPeriod(r3);
      const existing = rows.find((x3) => x3.requestId === r3.id);
      if (existing) scn = existing.scnNumber;
      else {
        const sequence = nextSequence(rows, year, month);
        scn = `${code}-SC-${year}-${pad(month)}-${String(sequence).padStart(4, "0")}`;
        store.add({ scnNumber: scn, companyCode: code, companyName: r3.values.company, year, month, sequence, requestId: r3.id, requestType: r3.type, boardMeetingDate: r3.values.boardDate || null, approvalDate: now2, legalApprover: "Legal Manager", generatedDocumentLink: null, status: "Reserved", sample: !!r3.sample });
      }
    }
    return stage(r3, "Processing", { scn, approvalState: "Reserved", approvalDate: now2, legalApprover: "Legal Manager", audit: audit(r3, "Approval and number reservation", "Legal Manager") });
  });
}
async function completeApproval(request, finalDocument, finalPDF, email) {
  return atomic(request, (r3, rows, store) => {
    if (r3.approvalState === "Approved") return r3;
    if (r3.approvalState !== "Reserved") throw new Error("Approval must be reserved first.");
    if (r3.scn) {
      const entry = rows.find((x3) => x3.requestId === r3.id);
      if (!entry) throw new Error("The SC number reservation is missing.");
      store.put({ ...entry, status: "Approved", generatedDocumentLink: "#document/" + r3.id });
    }
    return stage(r3, "Document Ready", { approvalState: "Approved", document: true, finalDocument, finalPDF, email, templateVersion: "2026-10-05", generatedAt: (/* @__PURE__ */ new Date()).toISOString(), audit: audit(r3, "Final PDF and email handoff prepared", "System") });
  });
}
async function markCompleted(request) {
  return atomic(request, (r3) => {
    if (r3.approvalState !== "Approved") throw new Error("Only ready documents can be completed.");
    return stage(r3, "Completed", { audit: audit(r3, "Marked completed", "Requester") });
  });
}
if (channel) channel.onmessage = async () => {
  try {
    await hydrateApproval();
    onChange();
  } catch {
  }
};
