/* approval-ui.js — Approval panel, register page and document review screen. */
var e6 = (v3) => String(v3 ?? "").replace(/[&<>"']/g, (c3) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c3]);
function scnSummary(r3) {
  return `<div class="scn-summary"><div><span class="small-label">SC Number</span><strong>${e6(scnStatus(r3))}</strong></div>${isCertificate(r3) ? `<div><span class="small-label">${r3.scn ? "Document SC number" : "Preview placeholder"}</span><strong>${e6(scnPreview(r3))}</strong><p class="help">${r3.scn ? "Reserved in the demo register." : "Temporary placeholder. The official SC number is assigned upon approval."}</p></div>` : '<p class="help">This document does not use Secretary\u2019s Certificate numbering.</p>'}</div>`;
}
function approvalFlow(r3) {
  const labels = ["Request submitted", "Legal Assistant amends document", "Legal Manager reviews", "Official SC number reserved", "Approved PDF available", "President email handoff"];
  const index = r3.approvalState === "Approved" ? 4 : r3.approvalState === "Reserved" ? 3 : r3.approvalState === "For Approval" ? 2 : 1;
  return `<ol class="flow-mini">${labels.map((s3, i3) => `<li class="${i3 < index ? "done" : i3 === index ? "current" : ""}">${s3}${i3 === 3 && !isCertificate(r3) ? "<small>Not applicable to this document</small>" : ""}${i3 === 5 && r3.email ? `<small>${e6(r3.email.status)}</small>` : ""}</li>`).join("")}</ol>`;
}
function emailBox(r3) {
  if (r3.approvalState !== "Approved") return "";
  const email = r3.email || preparePresidentEmail(r3);
  return `<section class="email-box"><h3>President email handoff</h3><dl><dt>To</dt><dd>${e6(email.to || presidentEmail() || "President email address not configured")}</dd></dl><dl><dt>Status</dt><dd>${e6(email.status)} \xB7 Not sent</dd></dl><dl><dt>Subject</dt><dd>${e6(email.subject)}</dd></dl><dl><dt>PDF attachment</dt><dd>${e6(email.attachment)}</dd></dl>${currentRole() === "manager" ? `<a href="#companies">Company Setup</a> \xB7 <a href="#email-settings">Fallback recipient</a><br><button class="btn" data-action="download-email" data-id="${e6(r3.id)}">Download email draft with PDF</button>` : ""}</section>`;
}
function previewPage(r3, { unsaved = false, error = "" } = {}) {
  const approved = r3.approvalState === "Approved", state2 = r3.approvalState || "Assistant Review", role2 = currentRole(), rejected = state2 === "Rejected", reserved = state2 === "Reserved", forApproval = state2 === "For Approval", editable = !unsaved && !approved && !reserved && !rejected && role2 !== "requester";
  const canSendAssistant = !unsaved && !approved && !reserved && !forApproval && !rejected && state2 !== "For Revision" && role2 === "requester";
  const canSendManager = editable && role2 === "assistant" && state2 !== "For Revision";
  return `<div class="breadcrumbs"><a href="${unsaved ? "#new" : "#request/" + e6(r3.id)}">${unsaved ? "Review Request" : e6(r3.id)}</a><span>/</span>Document Preview</div><div class="page-heading"><div><h1>${approved ? "Approved document" : "Document review"}</h1><p class="sub">${e6(documentTitle(r3))} \xB7 ${unsaved ? "Unsubmitted draft" : e6(r3.id)}</p></div><a class="btn" href="${unsaved ? "#new" : "#request/" + e6(r3.id)}">Back to ${unsaved ? "Review" : "Request"}</a></div>${scnSummary(r3)}${requestSourcePanel(r3)}${["For Revision", "Rejected"].includes(state2) ? `<div class="revision-banner"><strong>${state2 === "Rejected" ? "Request rejected" : "Clarification required"}</strong><br>${e6(r3.comments)}<br><span class="help">No official SC number consumed.</span></div>` : ""}<div class="document-toolbar"><button class="btn" data-action="download-docx" data-id="${e6(r3.id)}">Download ${approved ? "approved Word file" : "draft Word file"}</button><button class="btn ${approved ? "primary" : ""}" data-action="download-pdf" data-id="${e6(r3.id)}">Download ${approved ? "approved PDF" : "draft PDF"}</button>${canSendAssistant ? `<button class="btn primary" data-action="approval-legal" data-id="${e6(r3.id)}">Send to Legal Assistant</button>` : ""}${state2 === "For Revision" && role2 === "requester" ? `<button class="btn" data-action="revise-request" data-id="${e6(r3.id)}">Edit request & respond</button>` : ""}</div>${r3.requesterResponse ? `<div class="revision-banner"><strong>Requester response</strong><br>${e6(r3.requesterResponse)}</div>` : ""}${error ? `<div class="approval-error" role="alert">${e6(error)}</div>` : ""}${editable ? `<section class="editor-panel"><div class="review-title"><h3>Amend document</h3><span class="small-label">Version ${r3.documentVersion || 1} \xB7 ${role2 === "assistant" ? "Legal Assistant" : "Legal Manager"}</span></div>${templateSetup(r3)}<p class="role-note">Edit the resolution clauses below. The template heading, certification, signature and notarial sections remain in the supplied format. SC numbering is managed separately.</p><label class="small-label" for="document-editor">${templateKey(r3) === "deed" ? "Sale and warranty clauses" : "Resolution clauses"}</label><textarea id="document-editor">${e6(documentBodyText(r3))}</textarea><div class="editor-actions"><button class="btn" data-action="save-amendment" data-id="${e6(r3.id)}">Save amendment</button>${canSendManager ? `<button class="btn primary" data-action="amend-and-send" data-id="${e6(r3.id)}">Save & send to Legal Manager</button>` : ""}<span>${r3.amendedBy ? "Last amended by " + e6(r3.amendedBy) : "Preview updates as you type. Save amendments before sending for approval."}</span></div></section>` : ""}<div class="document-layout"><article class="document-paper template-paper" aria-label="Document preview"><div class="template-preview-heading"><span>${e6(templateLabels[templateKey(r3)] || "Template selection required")}</span><span>${approved ? "Approved" : "Draft"}</span></div><div id="template-pdf-preview" data-preview-id="${e6(r3.id)}"><p class="sub">Preparing template preview...</p></div><p class="paper-note">${missingTemplateFields(r3).length ? "Complete missing document fields in Legal view before approval." : "Preview and PDF use the same template rendering."}</p></article><aside class="panel approval-card"><h2>${approved ? "Approved" : role2 === "manager" ? "Legal Manager review" : "Request progress"}</h2><p class="role-note">${role2 === "requester" ? "Legal reviews and prepares the requested document." : role2 === "assistant" ? "Amend the draft, clarify missing information, then send it to the Legal Manager." : "Review the document and amendments. Approval prepares a PDF email handoff for the President."}</p>${role2 === "manager" && (forApproval || reserved) ? `<label class="small-label" for="legal-comments">Legal comments</label><textarea id="legal-comments" placeholder="Revision details or rejection reason"></textarea><button class="btn primary" data-action="approval-approve" data-id="${e6(r3.id)}">${reserved ? "Retry PDF generation" : "Approve & prepare President email"}</button>${!reserved ? `<button class="btn" data-action="approval-revise" data-id="${e6(r3.id)}">Request clarification</button><button class="btn" data-action="approval-reject" data-id="${e6(r3.id)}">Reject request</button>` : ""}` : ""}${role2 === "assistant" && !approved && !reserved && !rejected ? `<label class="small-label" for="legal-comments">Clarification for requester</label><textarea id="legal-comments" placeholder="What information is needed?"></textarea><button class="btn" data-action="approval-revise" data-id="${e6(r3.id)}">Request clarification</button>` : ""}${role2 === "manager" && !approved && !forApproval && !reserved ? "<p>Waiting for the Legal Assistant to submit this document for approval.</p>" : ""}${approvalFlow(r3)}<a class="register-link" href="#scn-register">SC register</a>${emailBox(r3)}${r3.audit?.length ? `<ul class="audit-list">${r3.audit.slice(-4).map((a3) => `<li>${e6(a3.action)}<br>${e6(a3.actor)}</li>`).join("")}</ul>` : ""}</aside></div>`;
}
function templateSetup(r3) {
  return `<details class="template-setup" open><summary>Document template & mapped fields</summary><div class="field"><label for="document-template">Supplied template</label><select id="document-template" data-template-select><option value="">Select a template</option>${Object.entries(templateLabels).filter(([id]) => !r3.resolutionWorkflow || id === "custom").map(([id, label]) => `<option value="${id}" ${templateKey(r3) === id ? "selected" : ""}>${e6(label)}</option>`).join("")}</select></div><div class="fields">${templateFields(r3).map((f3) => `<div class="field ${f3.type === "textarea" ? "wide" : ""}"><label for="template-${f3.key}">${e6(f3.label)}</label>${f3.type === "textarea" ? `<textarea id="template-${f3.key}" data-template-field="${f3.key}">${e6(f3.value)}</textarea>` : `<input id="template-${f3.key}" type="${f3.type}" data-template-field="${f3.key}" value="${e6(f3.value)}" ${f3.readonly ? "readonly" : ""} ${f3.type === "number" ? 'min="0" step="any"' : ""}>`}</div>`).join("")}</div><button class="btn" data-action="save-template-fields" data-id="${e6(r3.id)}">Update mapped fields & preview</button><p class="help">For source-linked certificates, the President name comes only from the selected Board Resolution. Requested action and agency are draft substitutions for Legal verification. Corporate Secretary and ID defaults come from the supplied templates. Confirm them for this request. Notarial blanks remain for execution.</p></details>`;
}
async function performApproval(action, r3, comments) {
  if (action === "approval-legal") {
    requireView("requester");
    return sendToAssistant(r3);
  }
  if (action === "approval-send") {
    requireView("assistant");
    validateResolutionRequest(r3);
    validateTemplate(r3);
    return sendForApproval(r3);
  }
  if (action === "approval-revise") {
    requireView("assistant", "manager");
    return returnForRevision(r3, comments);
  }
  if (action === "approval-reject") {
    requireView("manager");
    return rejectRequest(r3, comments);
  }
  if (action === "approval-approve") {
    requireView("manager");
    if (!["Approved", "Reserved"].includes(r3.approvalState)) {
      validateResolutionRequest(r3);
      validateTemplate(r3);
    }
    const reserved = await reserveForApproval(r3);
    if (reserved.approvalState === "Approved") return reserved;
    const docx = await createDocx(reserved, true), pdf = await createPDF(reserved, true), email = preparePresidentEmail(reserved);
    return completeApproval(reserved, docx, pdf, email);
  }
  throw new Error("Unknown approval action.");
}
function registerPage() {
  const rows = registerRecords();
  return `<div class="page-heading"><div><h1>SC register</h1><p class="sub">One chronological sequence per month across all companies.</p></div><a class="btn" href="#requests">Back to requests</a></div><div class="info-strip">Prototype register. Company codes identify the company; the monthly counter is shared. Drafts do not consume numbers. Previously issued numbers are retained; new reservations use the highest monthly sequence plus one.</div><section class="panel"><div class="table-wrap"><table><thead><tr><th>SC Number</th><th>Company</th><th>Year / Month</th><th>Sequence</th><th>Request ID</th><th>Request Type</th><th>Board Meeting Date</th><th>Approval Date</th><th>Legal Approver</th><th>Document</th><th>Status</th></tr></thead><tbody>${rows.map((r3) => `<tr><td>${e6(r3.scnNumber)}</td><td>${e6(r3.companyCode)}</td><td>${r3.year}-${String(r3.month).padStart(2, "0")}</td><td>${r3.sequence}</td><td><a href="#request/${e6(r3.requestId)}">${e6(r3.requestId)}</a></td><td>${e6(r3.requestType)}</td><td>${e6(r3.boardMeetingDate || "\u2014")}</td><td>${e6(r3.approvalDate?.slice(0, 10) || "\u2014")}</td><td>${e6(r3.legalApprover)}</td><td>${r3.generatedDocumentLink ? `<a href="${e6(r3.generatedDocumentLink)}">Open</a>` : "Pending generation"}</td><td>${e6(r3.status)}</td></tr>`).join("")}</tbody></table></div></section>`;
}
