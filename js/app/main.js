/* main.js — Router, event handling and page rendering. */
var app = document.getElementById("app");
var esc2 = (v3) => String(v3 ?? "").replace(/[&<>"']/g, (c3) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c3]);
var icon = (name) => `<span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${iconPaths[name] || iconPaths.document}"/></svg></span>`;
var typeBy = (id) => types.find((t3) => t3.id === id);
var dateLabel = (d3) => new Date(d3).toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric", timeZone: "Asia/Manila" });
var dateKey = (d3) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Manila" }).format(new Date(d3));
var badge = (s3) => `<span class="badge ${badgeClass[s3] || ""}">${esc2(s3)}</span>`;
var draft = loadDraft() || { type: "", values: {}, step: 1, part: 0 };
var attachments = [];
var errors = [];
var confirmed = false;
var filters = { search: "", company: "", type: "", status: "", date: "" };
var lastSubmitted = null;
var homeStage = "";
var intake;
try {
  intake = JSON.parse(localStorage.getItem("nb.legal.certificate-intake.v1") || "null");
} catch {
}
intake = intake || { values: {}, selected: "", searched: false, confirmed: false };
var saveIntake = () => localStorage.setItem("nb.legal.certificate-intake.v1", JSON.stringify(intake));
function collectIntake() {
  const form = document.getElementById("certificate-intake");
  if (form) {
    const values = Object.fromEntries(new FormData(form));
    values.companyCode = String(values.companyCode || "").trim().toUpperCase();
    intake.values = values;
  }
  return intake.values;
}
function certificateWizard(error = "") {
  app.innerHTML = intakePage(intake, error);
}
function toast(message) {
  const el2 = document.getElementById("toast");
  el2.textContent = message;
  el2.style.display = "block";
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => el2.style.display = "none", 4800);
}
function go2(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}
function newDraft() {
  if (currentRole() !== "requester") {
    toast("Switch to Requestor view to submit a request.");
    return;
  }
  intake = { values: {}, selected: "", searched: false, confirmed: false };
  saveIntake();
  go2("#new");
}
function heading(title, subtitle, button = true) {
  return `<div class="page-heading"><div><h1>${title}</h1><p class="sub">${subtitle}</p></div>${button && currentRole() === "requester" ? '<button class="btn primary" data-action="new">New Secretary&#39;s Certificate Request</button>' : ""}</div>`;
}
function table(records) {
  return requestTable(records);
}
function downloadTarget(id) {
  const r3 = visibleRequests().find((r4) => r4.id === id);
  if (!r3) throw new Error("This document is not available in the selected requester profile.");
  return r3;
}
function visibleRequests() {
  return getRequests();
}
function home() {
  app.innerHTML = homePage(visibleRequests(), homeStage);
}
function options(items, selected) {
  return items.map((x3) => `<option value="${esc2(x3)}" ${x3 === selected ? "selected" : ""}>${esc2(x3)}</option>`).join("");
}
function requests() {
  const rows = visibleRequests();
  app.innerHTML = heading(currentRole() === "requester" ? "My Requests" : "Request queue", "") + `<section class="panel"><div class="filters"><div><label for="search">Search requests</label><input id="search" data-filter="search" placeholder="Request ID, company, or purpose" value="${esc2(filters.search)}"></div><div><label for="filter-company">Company</label><select id="filter-company" data-filter="company"><option value="">All companies</option>${options([...new Set(rows.map(companyLabel))].sort(), filters.company)}</select></div><div><label for="filter-type">Request type</label><select id="filter-type" data-filter="type"><option value="">All request types</option>${types.map((t3) => `<option value="${t3.id}" ${filters.type === t3.id ? "selected" : ""}>${t3.short}</option>`).join("")}</select></div><div><label for="filter-status">Status</label><select id="filter-status" data-filter="status"><option value="">All statuses</option>${options(statuses, filters.status)}</select></div><div><label for="filter-date">Submitted date</label><input type="date" id="filter-date" data-filter="date" value="${esc2(filters.date)}"></div></div><div id="request-results"></div><div class="table-foot"><span id="result-count"></span><button class="btn ghost" data-action="clear-filters">Clear filters</button></div></section>`;
  updateResults();
}
function updateResults() {
  const rows = visibleRequests().filter((r3) => (!filters.search || [r3.id, r3.values.company, r3.values.purpose, r3.displayType || typeBy(r3.type)?.title || r3.type, r3.scn].join(" ").toLowerCase().includes(filters.search.toLowerCase())) && (!filters.company || companyLabel(r3) === filters.company) && (!filters.type || r3.type === filters.type) && (!filters.status || canonicalStatus(r3) === filters.status) && (!filters.date || dateKey(r3.date) === filters.date));
  document.getElementById("request-results").innerHTML = table(rows, true);
  document.getElementById("result-count").textContent = `${rows.length} request${rows.length === 1 ? "" : "s"} found`;
}
function catalog() {
  app.innerHTML = heading("Document Types", "Secretary\u2019s Certificates issued from confirmed Board Resolutions.", false) + `<div class="catalog">${categories.map((c3) => `<article class="panel catalog-card"><h2>${esc2(c3.label)}</h2><p>Legal prepares a certificate from the confirmed source resolution.</p>${currentRole() === "requester" ? `<button class="btn" data-action="category-start" data-category="${c3.id}">Start request</button>` : ""}</article>`).join("")}</div><p class="help">Previously submitted document types and downloads remain available under Requests.</p>`;
}
function field(f3) {
  const val = draft.values[f3.key] ?? "";
  const id = "field-" + f3.key;
  const req = !f3.optional;
  let html;
  if (f3.type === "checkboxes") {
    html = `<fieldset class="check-group"><legend>${f3.label}${req ? '<span class="required">*</span>' : ""}</legend><div class="checks">${f3.options.map((op, i3) => `<label><input type="checkbox" data-field="${f3.key}" value="${esc2(op)}" ${Array.isArray(val) && val.includes(op) ? "checked" : ""}>${esc2(op)}</label>`).join("")}</div></fieldset>`;
  } else {
    const label = `<label for="${id}">${esc2(f3.label)} ${f3.optional ? '<span class="optional">(optional)</span>' : '<span class="required">*</span>'}</label>`;
    let input;
    if (f3.type === "textarea") input = `<textarea id="${id}" data-field="${f3.key}" ${req ? "required" : ""} maxlength="5000">${esc2(val)}</textarea>`;
    else if (f3.type === "select") input = `<select id="${id}" data-field="${f3.key}" ${req ? "required" : ""}><option value="">Select an option</option>${options(f3.options, val)}</select>`;
    else input = `<input id="${id}" data-field="${f3.key}" type="${f3.type}" value="${esc2(val)}" ${f3.type === "number" ? 'min="0" step="any"' : ""} ${f3.type === "text" ? 'maxlength="500"' : ""} ${f3.key === "company" ? 'list="saved-company-options"' : ""} ${selectedProfile() && ["company", "companyCode", "department"].includes(f3.key) ? "readonly" : ""} ${req ? "required" : ""}>`;
    if (f3.key === "company") input += `<datalist id="saved-company-options">${companies().map((c3) => `<option value="${esc2(c3.name)}">${esc2(c3.code)}</option><option value="${esc2(c3.code)}">${esc2(c3.name)}</option>`).join("")}</datalist>`;
    html = `<div class="field ${f3.type === "textarea" ? "wide" : ""}">${label}${input}${f3.help ? `<p class="help">${f3.help}</p>` : ""}</div>`;
  }
  if (val === "Other" || val === "Other Government Agency" || Array.isArray(val) && val.includes("Other")) html += `<div class="field wide"><label for="${id}-other">Please specify Other <span class="required">*</span></label><input id="${id}-other" data-field="${f3.key}Other" value="${esc2(draft.values[f3.key + "Other"] || "")}" required maxlength="500"></div>`;
  return html;
}
function steps() {
  const names = [["Request type", "Choose a category"], ["General information", "Tell us the basics"], ["Specific details", "Only what is relevant"], ["Review & submit", "Confirm your request"]];
  return `<aside class="panel step-sidebar"><h3>New Legal Request</h3>${names.map(([name, note], i3) => `<div class="step-item ${draft.step === i3 + 1 ? "active" : draft.step > i3 + 1 ? "done" : ""}"><span class="step-num">${draft.step > i3 + 1 ? "\u2713" : i3 + 1}</span><span class="step-name">${name}<small>${note}</small></span></div>`).join("")}<div class="sidebar-note"><strong>Built around your request</strong>You'll only see fields relevant to the document you need. Your progress is saved in this browser.<br><br>Fields marked * are required.</div></aside>`;
}
function errorBox() {
  return errors.length ? `<div class="error" role="alert">${errors.map(esc2).join("<br>")}</div>` : "";
}
function wizard() {
  if (!draft.values.documentCategory) draft.values.documentCategory = draft.type === "asset" ? "Deed of Absolute Sale" : draft.type === "other" ? "Other Legal Document" : draft.type === "board" ? "Board Resolution" : "Secretary\u2019s Certificate";
  if (!draft.values.companyCode && /^[A-Z][A-Z0-9]{1,11}$/.test(draft.values.company || "")) draft.values.companyCode = draft.values.company;
  if (!typeBy(draft.type) && draft.step > 1) draft.step = 1;
  const t3 = typeBy(draft.type);
  const groups = t3 ? groupsFor(t3, draft.values) : [];
  draft.part = Math.max(0, Math.min(draft.part, groups.length - 1));
  let content = "";
  if (draft.step === 1) content = `<div class="form-heading"><div class="eyebrow">Step 1 of 4</div><h2>What do you need Legal to prepare?</h2><p>Choose the request type that best matches your requirement.</p></div><div class="type-grid">${types.map((t4) => `<button class="type-card ${draft.type === t4.id ? "selected" : ""}" data-action="select-type" data-type="${t4.id}" aria-pressed="${draft.type === t4.id}">${icon(t4.icon)}<span><span class="card-name">${t4.title}</span><span class="card-desc">${t4.description}</span></span><span class="radio-dot"></span></button>`).join("")}</div>`;
  if (draft.step === 2) content = `<div class="form-heading"><div class="eyebrow">Step 2 of 4</div><h2>General information</h2><p>A few details to help Legal understand your request.</p></div><div class="selected-label">${esc2(t3.title)}</div>${errorBox()}<div class="fields">${generalFields(draft.values, draft.type).map(field).join("")}</div>`;
  if (draft.step === 3) {
    const g3 = groups[draft.part];
    content = `<div class="form-heading"><div class="eyebrow">Step 3 of 4 \xB7 Section ${draft.part + 1} of ${groups.length}</div><h2>${esc2(g3.title)}</h2><p>${esc2(t3.short)}${t3.id === "other" ? " \xB7 Requests outside existing templates may require Legal review." : ""}</p></div><div class="sub-progress">${groups.map((_3, i3) => `<span class="${i3 <= draft.part ? "on" : ""}"></span>`).join("")}</div>${errorBox()}<div class="field-group"><div class="fields">${g3.fields.map(field).join("")}</div>${g3.fields.includes(extra) ? `<div class="section-title">Supporting Documents <span class="optional">(optional)</span></div><div class="upload"><label for="files" class="small-label">Attach contracts, quotations, proposals, previous resolutions, or supporting documents</label><input id="files" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"><p class="help">Up to 5 files \xB7 5 MB each. PDF, Word, Excel, text, or images. Files remain in this browser. Reattach files if you reload before submitting.</p><div id="files-list">${fileList()}</div></div>` : ""}</div>`;
  }
  if (draft.step === 4) content = `<div class="form-heading"><div class="eyebrow">Step 4 of 4</div><h2>Review your request</h2><p>Check the information below before submitting your demo request.</p></div>${errorBox()}${review({ type: draft.type, values: draft.values, attachments }, true)}<div class="review-scn">${scnSummary(draftRecord())}<button class="btn" data-action="preview-draft">Preview Draft Document \u2192</button></div><label class="confirmation"><input id="confirm" type="checkbox" ${confirmed ? "checked" : ""}><span>I have reviewed this information and confirm it is correct. This demo submission will be saved in my browser and is not sent to Legal.</span></label>`;
  const nextLabel = draft.step === 4 ? draft.editingId ? "Save Revision" : "Submit Request" : draft.step === 3 && draft.part === groups.length - 1 ? "Review Request" : "Continue \u2192";
  app.innerHTML = `<div class="breadcrumbs"><a href="#home">Home</a><span>/</span>New Request</div><div class="workflow">${steps()}<section class="panel form-panel">${content}<div class="form-actions"><span class="hint">${draft.step === 1 ? "Select one request type to continue." : "Progress saved automatically"}</span><div>${draft.step === 4 && draft.editingId ? '<span class="small-label">Revised request</span>' : ""}${draft.step > 1 ? '<button class="btn" data-action="back">\u2190 Back</button>' : ""}<button class="btn primary" data-action="continue" ${draft.step === 1 && !draft.type || draft.step === 4 && !confirmed ? "disabled" : ""}>${nextLabel}</button></div></div></section></div>`;
}
function fileList() {
  return attachments.map((a3, i3) => `<div class="file-row"><span>${esc2(a3.name)} <span class="small-label">(${Math.ceil(a3.size / 1024)} KB)</span></span><button type="button" data-action="remove-file" data-index="${i3}" aria-label="Remove ${esc2(a3.name)}">Remove</button></div>`).join("");
}
var personKeys = ["authorizedSignatory", "signatoryPosition", "authorizedRepresentative", "authorizedPerson", "position", "bankSignatories", "signingArrangement", "sellerSignatory", "sellerPosition"];
var financeKeys = ["totalAmount", "currency", "sourceOfFunds", "paymentBasis", "rate", "amount", "dividendAmount", "saleAmount", "vatInclusive"];
function review(r3, editable = false) {
  if (r3.resolutionWorkflow) return `<section class="review-section"><h3>Request information</h3><div class="review-grid">${[["Requestor", r3.values.requestor], ["Company", r3.values.companyCode], ["Needed by", r3.values.neededBy], ["Category", categoryLabel(r3.values.resolutionCategory)], ["Context", r3.values.context || "\u2014"], ["Requested action", r3.values.requestedAction || "Source wording"], ["Agency / counterparty", r3.values.requestCounterparty || "Source wording"]].map(([k3, v3]) => `<dl class="review-item"><dt>${esc2(k3)}</dt><dd>${esc2(v3)}</dd></dl>`).join("")}</div></section>${requestSourcePanel(r3)}`;
  const t3 = typeBy(r3.type);
  const specific = allFields(t3, r3.values).filter((f3) => !common.some((c3) => c3.key === f3.key) && f3.key !== "additional");
  const sections = [["Request Information", [{ key: "requestType", label: "Request Type", fixed: t3.title }, ...generalFields(r3.values, r3.type)], 2], ["Request-Specific Details", specific.filter((f3) => !personKeys.includes(f3.key) && !financeKeys.includes(f3.key)), 3], ["Authorized Persons", specific.filter((f3) => personKeys.includes(f3.key)), 3], ["Financial Information", specific.filter((f3) => financeKeys.includes(f3.key)), 3], ["Additional Information", [extra], 3]];
  let html = sections.map(([title, fields, step]) => {
    const filled = fields.filter((f3) => f3.fixed || r3.values[f3.key] !== void 0 && r3.values[f3.key] !== "" && (!Array.isArray(r3.values[f3.key]) || r3.values[f3.key].length));
    if (!filled.length) return "";
    return `<section class="review-section"><div class="review-title"><h3>${title}</h3>${editable ? `<button class="btn ghost" data-action="edit" data-step="${step}" data-title="${title}">Edit</button>` : ""}</div><div class="review-grid">${filled.map((f3) => {
      let val = f3.fixed || r3.values[f3.key];
      if (Array.isArray(val)) val = val.join(", ");
      if (f3.type === "number") val = Number(val).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (r3.values[f3.key + "Other"] && (r3.values[f3.key] === "Other" || r3.values[f3.key] === "Other Government Agency" || Array.isArray(r3.values[f3.key]) && r3.values[f3.key].includes("Other"))) val += ` \u2014 ${r3.values[f3.key + "Other"]}`;
      return `<dl class="review-item"><dt>${esc2(f3.label)}</dt><dd>${esc2(val)}</dd></dl>`;
    }).join("")}</div></section>`;
  }).join("");
  const files = r3.attachments || [];
  if (files.length) html += `<section class="review-section"><div class="review-title"><h3>Attachments</h3>${editable ? '<button class="btn ghost" data-action="edit" data-step="3" data-title="Attachments">Edit</button>' : ""}</div>${files.map((a3, i3) => `<div class="file-row"><span>${esc2(a3.name)} <span class="small-label">(${Math.ceil(a3.size / 1024)} KB)</span></span>${!editable && a3.data ? `<button data-action="download-attachment" data-id="${esc2(r3.id)}" data-index="${i3}">Download</button>` : ""}</div>`).join("")}</section>`;
  return html;
}
function details(id) {
  const r3 = visibleRequests().find((x3) => x3.id === id);
  if (!r3) {
    app.innerHTML = heading("Request not available", "This request is outside the selected requester profile or is not stored in this browser.", false) + '<a class="btn" href="#requests">Back to My Requests</a>';
    return;
  }
  const t3 = typeBy(r3.type);
  app.innerHTML = `<div class="breadcrumbs"><a href="#requests">My Requests</a><span>/</span>${esc2(r3.id)}</div><div class="page-heading"><div><div class="eyebrow">${currentRole() === "requester" ? "Requester view" : currentRole() === "assistant" ? "Legal Assistant view" : "Legal Manager view"}</div><h1>${esc2(r3.id)}</h1><p class="sub">${esc2(t3.title)}</p></div>${badge(canonicalStatus(r3))}</div><div class="detail-layout"><section class="panel detail-main">${r3.status === "For Clarification" && currentRole() === "requester" ? `<section class="request-response"><h2>Legal needs your response</h2><p>${esc2(r3.comments)}</p><label class="small-label" for="clarification-response">Your response</label><textarea id="clarification-response" placeholder="Provide the requested information or explain your clarification."></textarea><div class="legal-action-row"><button class="btn primary" data-action="respond-clarification" data-id="${esc2(r3.id)}">Send response to Legal</button><button class="btn" data-action="revise-request" data-id="${esc2(r3.id)}">${r3.resolutionWorkflow ? "Review request" : "Edit request & attachments"}</button></div></section>` : ""}${r3.approvalState === "Approved" ? `<div class="legal-action-row" style="margin:0 0 22px"><button class="btn primary" data-action="download-pdf" data-id="${esc2(r3.id)}">Download approved PDF</button>${currentRole() === "requester" && r3.status === "Document Ready" ? `<button class="btn" data-action="mark-completed" data-id="${esc2(r3.id)}">Mark completed</button>` : ""}</div>` : ""}${["For Clarification", "For Revision"].includes(r3.status) ? `<div class="clarify"><h3>Clarification Required</h3>${esc2(r3.comments || "Legal has requested additional information.")}</div>` : ""}<div class="review-section"><div class="review-title"><h3>Request Overview</h3></div><div class="review-grid">${[["Request ID", r3.id], ["Date Submitted", dateLabel(r3.date)], ["Current Status", canonicalStatus(r3)], ["Days in stage", daysInStage(r3) + " days"], ...r3.scn ? [["SC Number", r3.scn]] : []].map(([k3, v3]) => `<dl class="review-item"><dt>${k3}</dt><dd>${esc2(v3)}</dd></dl>`).join("")}</div></div>${scnSummary(r3)}${review(r3)}<div class="review-section"><div class="review-title"><h3>Legal Comments</h3></div><div class="legal-notes"><p>${esc2(r3.comments || "No comments from Legal yet.")}</p>${r3.requesterResponse ? `<h3>Requester response</h3><p>${esc2(r3.requesterResponse)}</p>` : ""}</div></div></section><aside><section class="panel detail-side"><h2>Request progress</h2><p class="sub">${r3.sample ? "Illustrative workflow" : r3.approvalState === "Approved" ? "Approval complete" : "Request approval stages"}</p>${approvalFlow(r3)}<div class="doc-box"><strong>${r3.approvalState === "Approved" ? "Approved document available" : r3.resolutionWorkflow && !r3.resolutionSnapshot ? "Source identification pending" : "Draft preview available"}</strong><p>${r3.approvalState === "Approved" ? "View or download the approved demo document." : "Open the document to review it and take the next action."}</p><button class="btn" data-action="document" data-id="${esc2(r3.id)}">${r3.approvalState === "Approved" ? "View approved document" : currentRole() === "requester" ? "View draft document" : "Review & amend document"} \u2197</button></div><a class="register-link" href="#scn-register">View SC Register \u2192</a></section><a class="btn ghost" style="margin-top:15px" href="#requests">\u2190 Back to My Requests</a></aside></div>`;
}
function success() {
  const r3 = lastSubmitted;
  if (!r3) {
    go2("#requests");
    return;
  }
  app.innerHTML = `<section class="panel success"><div class="success-icon">\u2713</div><div class="eyebrow">Demo submission saved</div><h1>Request Submitted Successfully</h1><p class="sub">Your request is now available under My Requests in this browser.</p><div class="review-grid">${[["Request Reference Number", r3.id], ["Company", r3.values.company], ["Request Type", typeBy(r3.type).title], ["Date Submitted", dateLabel(r3.date)], ["Current Status", canonicalStatus(r3)], ["Days in stage", daysInStage(r3) + " days"]].map(([k3, v3]) => `<dl class="review-item"><dt>${k3}</dt><dd>${esc2(v3)}</dd></dl>`).join("")}</div><div class="success-actions"><a class="btn primary" href="#document/${esc2(r3.id)}">Review Draft Document \u2192</a><a class="btn" href="#request/${esc2(r3.id)}">View Request</a><button class="btn" data-action="new">Submit Another Request</button></div><p class="help" style="margin-top:20px">This prototype simulates Legal approval. Official demo SC numbers are reserved only when approval is simulated.</p></section>`;
}
function draftRecord() {
  return { id: draft.editingId || "UNSUBMITTED-DRAFT", type: draft.type, requesterProfile: selectedProfile()?.id || "current", values: draft.values, date: draft.editingId ? getRequests().find((r3) => r3.id === draft.editingId)?.date || (/* @__PURE__ */ new Date()).toISOString() : (/* @__PURE__ */ new Date()).toISOString(), approvalState: "Draft", scn: null };
}
var previewGeneration = 0;
var previewEditTimer;
function demoDocument(id, error = "") {
  const r3 = visibleRequests().find((x3) => x3.id === id);
  if (!r3) {
    details(id);
    return;
  }
  app.innerHTML = previewPage(r3, { error });
  rememberEditor();
  renderPDFPreview(r3);
}
function render() {
  const selected = currentRole();
  document.getElementById("company-setup-nav").hidden = selected === "requester";
  document.getElementById("resolution-library-nav").hidden = selected === "requester";
  document.querySelector('nav a[href="#types"]').hidden = selected !== "requester";
  document.getElementById("view-switch").value = selected;
  document.getElementById("view-avatar").textContent = views[selected].avatar;
  document.querySelector('nav a[href="#requests"]').textContent = selected === "requester" ? "My Requests" : "Requests";
  const statusRows = visibleRequests();
  document.querySelector(".dot").style.display = (selected === "requester" ? statusRows.some((r3) => ["For Clarification", "Document Ready"].includes(canonicalStatus(r3))) : legalNotifications(statusRows, selected).count > 0) ? "block" : "none";
  const hash = location.hash || "#home";
  document.querySelectorAll("nav a").forEach((a3) => a3.classList.toggle("active", a3.getAttribute("href") === (hash.startsWith("#request/") || hash === "#success" || hash.startsWith("#document/") || hash === "#scn-register" ? "#requests" : hash)));
  document.querySelector("nav").classList.remove("open");
  app.classList.toggle("page-home", hash === "#home");
  if (hash === "#home") home();
  else if (hash === "#requests") requests();
  else if (hash === "#types") catalog();
  else if (hash === "#new") {
    if (selected === "requester") certificateWizard();
    else app.innerHTML = '<p>Switch to Requester view to start a new request.</p><a href="#home">Back to home</a>';
  } else if (hash === "#resolutions") app.innerHTML = libraryPage();
  else if (hash.startsWith("#resolution/")) app.innerHTML = libraryPage(decodeURIComponent(hash.slice(12)));
  else if (hash === "#success") success();
  else if (hash === "#scn-register") app.innerHTML = registerPage();
  else if (hash === "#companies") {
    if (selected === "requester") app.innerHTML = "<p>Company Setup is available in Legal Assistant and Legal Manager views.</p>";
    else app.innerHTML = companySetupPage();
  } else if (hash === "#email-settings") emailSettings();
  else if (hash === "#draft-document") {
    app.innerHTML = typeBy(draft.type) ? previewPage(draftRecord(), { unsaved: true }) : '<a href="#new">Start a request first</a>';
    if (typeBy(draft.type)) renderPDFPreview(draftRecord());
  } else if (hash.startsWith("#request/")) details(decodeURIComponent(hash.slice(9)));
  else if (hash.startsWith("#document/")) demoDocument(decodeURIComponent(hash.slice(10)));
  else home();
  window.scrollTo(0, 0);
}
function updateField(el2) {
  const key = el2.dataset.field;
  if (!key) return;
  const before = draft.values[key];
  if (el2.type === "checkbox") draft.values[key] = [...app.querySelectorAll(`input[data-field="${key}"]:checked`)].map((x3) => x3.value);
  else draft.values[key] = key === "companyCode" ? el2.value.trim().toUpperCase() : el2.value;
  if (el2.tagName === "SELECT" || el2.type === "checkbox") {
    const oldOther = before === "Other" || before === "Other Government Agency" || Array.isArray(before) && before.includes("Other");
    const val = draft.values[key];
    const newOther = val === "Other" || val === "Other Government Agency" || Array.isArray(val) && val.includes("Other");
    if (key === "assetType" && val !== "Motor Vehicle") for (const k3 of ["vehicleModel", "chassisNumber", "engineNumber", "fileNumber", "plateNumber"]) delete draft.values[k3];
    if (!newOther) delete draft.values[key + "Other"];
    saveDraft(draft);
    if (oldOther !== newOther || key === "assetType" || key === "documentCategory") wizard();
  } else saveDraft(draft);
  confirmed = false;
}
app.addEventListener("keydown", (e7) => {
  const row = e7.target.closest("[data-request-id]");
  if (row && e7.target === row && ["Enter", " "].includes(e7.key)) {
    e7.preventDefault();
    go2("#" + (row.dataset.rowTarget || "request") + "/" + row.dataset.requestId);
  }
});
app.addEventListener("input", (e7) => {
  if (e7.target.id === "resolution-filter") {
    const q3 = e7.target.value.toLowerCase();
    document.getElementById("resolution-library-results").innerHTML = libraryRows(resolutions().filter((r3) => [r3.company, r3.subject, r3.sourceText].join(" ").toLowerCase().includes(q3)));
    return;
  }
  if (e7.target.id === "confirm-resolution") return;
  if (e7.target.hasAttribute("data-request-variable")) {
    collectIntake();
    intake.confirmed = false;
    saveIntake();
    const checkbox = document.getElementById("confirm-resolution");
    if (checkbox) checkbox.checked = false;
    const button = app.querySelector('#certificate-intake button[type="submit"]');
    if (button) button.disabled = true;
    const source = resolutionBy(intake.selected), preview = document.getElementById("request-wording-preview");
    if (source && preview) preview.textContent = renderResolutionText(source.clauses, source, intake.values);
    return;
  }
  if (e7.target.closest("#certificate-intake")) {
    collectIntake();
    intake.confirmed = false;
    intake.selected = "";
    intake.searched = false;
    saveIntake();
    const button = app.querySelector('#certificate-intake button[type="submit"]');
    if (button) button.disabled = true;
    return;
  }
  if (e7.target.dataset.filter !== void 0) {
    filters[e7.target.dataset.filter] = e7.target.value;
    updateResults();
  } else if (e7.target.dataset.field) updateField(e7.target);
  else if (e7.target.matches("[data-template-field],#document-editor")) {
    clearTimeout(previewEditTimer);
    const current = getRequests().find((r3) => r3.id === document.getElementById("template-pdf-preview")?.dataset.previewId);
    if (current) {
      previewGeneration++;
      previewEditTimer = setTimeout(() => renderPDFPreview(previewRecord(current)), 600);
    }
  }
});
app.addEventListener("change", async (e7) => {
  if (e7.target.id === "resolution-file") {
    try {
      const row = await importResolution(e7.target.files[0]);
      go2("#resolution/" + row.id);
      toast("Original file retained. Verify extracted metadata.");
    } catch (err) {
      toast(err.message);
    }
    return;
  }
  if (e7.target.id === "confirm-resolution") {
    intake.confirmed = e7.target.checked;
    saveIntake();
    app.querySelector('#certificate-intake button[type="submit"]').disabled = !intake.confirmed;
    return;
  }
  if (e7.target.id === "requester-profile") {
    setRequesterProfile(e7.target.value);
    homeStage = "";
    render();
    return;
  }
  if (e7.target.id === "company-csv-file") {
    try {
      requireView("assistant", "manager");
      const file = e7.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) throw new Error("Use a CSV file under 2 MB.");
      const count = importCompanies(await file.text());
      app.innerHTML = companySetupPage();
      toast(`${count} compan${count === 1 ? "y" : "ies"} imported.`);
    } catch (err) {
      document.getElementById("company-import-result").textContent = err.message;
    }
    return;
  }
  if (["company", "companyCode"].includes(e7.target.dataset.field)) {
    const previous = findCompany(draft.values);
    updateField(e7.target);
    if (e7.target.dataset.field === "company") {
      draft.values.companyCode = "";
      if (previous) for (const key of ["legalCompanyName", "companyAddress", "presidentName", "presidentEmail"]) delete draft.values[key];
    }
    const defaults = companyDefaults(draft.values);
    if (Object.keys(defaults).length) draft.values = { ...draft.values, ...defaults };
    saveDraft(draft);
    wizard();
    return;
  }
  if (e7.target.matches("[data-template-select]")) {
    const id = app.querySelector('[data-action="save-template-fields"]')?.dataset.id;
    if (id) {
      const r3 = getRequests().find((r4) => r4.id === id);
      const selected = e7.target.value;
      const virtual = { ...previewRecord(r3), documentTemplate: selected, values: { ...r3.values, ...collectTemplateFields().values, documentCategory: selected === "deed" ? "Deed of Absolute Sale" : "Secretary\u2019s Certificate" } };
      app.innerHTML = previewPage(virtual);
      rememberEditor();
      renderPDFPreview(virtual);
    }
    return;
  }
  if (e7.target.id === "confirm") {
    confirmed = e7.target.checked;
    app.querySelector('[data-action="continue"]').disabled = !confirmed;
  } else if (e7.target.id === "files") {
    const allowed = /\.(pdf|docx?|xlsx?|txt|png|jpe?g)$/i;
    const selected = [...e7.target.files];
    const messages = [];
    for (const file of selected) {
      if (attachments.length >= 5) {
        messages.push("You may attach up to 5 files.");
        break;
      }
      if (file.size > 5 * 1024 * 1024) {
        messages.push(`${file.name} exceeds 5 MB.`);
        continue;
      }
      if (!allowed.test(file.name)) {
        messages.push(`${file.name} is not a supported file type.`);
        continue;
      }
      if (attachments.some((a3) => a3.name === file.name && a3.size === file.size)) continue;
      try {
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Could not read the file."));
          reader.readAsDataURL(file);
        });
        attachments.push({ name: file.name, size: file.size, mime: file.type, data });
      } catch {
        messages.push(`Could not read ${file.name}.`);
      }
    }
    if (messages.length) toast(messages.join(" "));
    const target = document.getElementById("files-list");
    if (target) target.innerHTML = fileList();
    e7.target.value = "";
  } else if (e7.target.dataset.field && (e7.target.tagName === "SELECT" || e7.target.type === "checkbox")) updateField(e7.target);
});
app.addEventListener("click", async (e7) => {
  const el2 = e7.target.closest("[data-action]");
  if (!el2) {
    const row = e7.target.closest("[data-request-id]");
    if (row) go2("#" + (row.dataset.rowTarget || "request") + "/" + row.dataset.requestId);
    return;
  }
  const act = el2.dataset.action;
  if (act === "category-start") {
    newDraft();
    intake.values.resolutionCategory = el2.dataset.category;
    saveIntake();
    certificateWizard();
    return;
  }
  if (act.startsWith("resolution-")) {
    await handleResolutionAction(act, el2);
    return;
  }
  if (act.startsWith("company-")) {
    try {
      requireView("assistant", "manager");
      if (act === "company-new") app.innerHTML = companySetupPage();
      else if (act === "company-edit") app.innerHTML = companySetupPage(el2.dataset.code);
      else if (act === "company-csv-template" || act === "company-csv-export") downloadCompanyCSV(act === "company-csv-template");
    } catch (err) {
      toast(err.message);
    }
    return;
  }
  if (act === "save-template-fields") {
    const r3 = getRequests().find((r4) => r4.id === el2.dataset.id);
    try {
      requireView("assistant", "manager");
      const fields = collectTemplateFields();
      const edited = previewRecord(r3);
      let updated = await updateTemplateFields(r3, fields.values, fields.template, currentRole() === "assistant" ? "Legal Assistant" : "Legal Manager");
      if (edited.documentBody !== r3.documentBody && edited.documentBody) updated = await amendDocument(updated, edited.documentBody, currentRole() === "assistant" ? "Legal Assistant" : "Legal Manager");
      demoDocument(updated.id);
      toast("Template fields and preview updated.");
    } catch (err) {
      demoDocument(r3.id, err.message);
    }
    return;
  }
  if (act === "home-stage") {
    homeStage = el2.dataset.stage;
    home();
    return;
  }
  if (act === "save-email-settings") {
    try {
      requireView("manager");
      setPresidentEmail(document.getElementById("president-email").value);
      toast("President email address saved. Sending account remains unconnected.");
      emailSettings();
    } catch (err) {
      toast(err.message);
    }
    return;
  }
  if (act === "download-pdf") {
    try {
      await downloadPDF(location.hash === "#draft-document" ? draftRecord() : previewRecord(downloadTarget(el2.dataset.id)));
    } catch (err) {
      toast(err.message);
    }
    return;
  }
  if (act === "download-email") {
    try {
      requireView("manager");
      await downloadEML(getRequests().find((r3) => r3.id === el2.dataset.id));
    } catch (err) {
      toast(err.message);
    }
    return;
  }
  if (act === "respond-clarification") {
    try {
      requireView("requester");
      const r3 = getRequests().find((r4) => r4.id === el2.dataset.id);
      await respondToClarification(r3, document.getElementById("clarification-response").value);
      details(r3.id);
      toast("Your response has been saved for Legal review.");
    } catch (err) {
      toast(err.message);
    }
    return;
  }
  if (act === "mark-completed") {
    try {
      requireView("requester");
      await markCompleted(getRequests().find((r3) => r3.id === el2.dataset.id));
      details(el2.dataset.id);
    } catch (err) {
      toast(err.message);
    }
    return;
  }
  if (act === "save-amendment" || act === "amend-and-send") {
    let r3 = getRequests().find((r4) => r4.id === el2.dataset.id);
    try {
      requireView("assistant", "manager");
      const fields = collectTemplateFields();
      const edited = document.getElementById("document-editor").value;
      const changed = edited !== document.getElementById("document-editor").dataset.originalBody;
      r3 = await updateTemplateFields(r3, fields.values, fields.template, currentRole() === "assistant" ? "Legal Assistant" : "Legal Manager");
      if (changed || templateKey(r3) === "custom" && !r3.documentBody) r3 = await amendDocument(r3, edited, currentRole() === "assistant" ? "Legal Assistant" : "Legal Manager");
      if (act === "amend-and-send") {
        if (r3.resolutionWorkflow && document.getElementById("verify-source-draft")?.checked) r3 = await verifyResolutionDraft(r3);
        r3 = await performApproval("approval-send", r3, "");
      }
      demoDocument(r3.id);
      toast(act === "amend-and-send" ? "Document saved and sent to Legal Manager." : "Document amendment saved.");
    } catch (err) {
      demoDocument(r3.id, err.message);
    }
    return;
  }
  if (act === "preview-draft") {
    go2("#draft-document");
    return;
  }
  if (act === "download-docx") {
    try {
      await downloadDocx(el2.dataset.id === "UNSUBMITTED-DRAFT" || location.hash === "#draft-document" ? draftRecord() : previewRecord(downloadTarget(el2.dataset.id)));
    } catch (err) {
      toast(err.message);
    }
    return;
  }
  if (act === "revise-request") {
    if (currentRole() !== "requester") {
      toast("Clarification responses are available in Requestor view.");
      return;
    }
    const r3 = getRequests().find((r4) => r4.id === el2.dataset.id);
    if (r3.resolutionWorkflow) {
      details(r3.id);
      document.getElementById("clarification-response")?.focus();
      return;
    }
    draft = { type: r3.type, values: { ...r3.values }, step: 2, part: 0, editingId: r3.id };
    attachments = (r3.attachments || []).slice();
    confirmed = false;
    errors = [];
    saveDraft(draft);
    go2("#new");
    return;
  }
  if (act.startsWith("approval-")) {
    let r3 = getRequests().find((r4) => r4.id === el2.dataset.id);
    const comments = app.querySelector("#legal-comments")?.value || "";
    el2.disabled = true;
    el2.textContent = "Processing\u2026";
    try {
      if (act === "approval-approve") {
        requireView("manager");
        const editor = document.getElementById("document-editor");
        if (editor) {
          const changed = editor.value !== editor.dataset.originalBody, edited = editor.value, fields = collectTemplateFields();
          r3 = await updateTemplateFields(r3, fields.values, fields.template, "Legal Manager");
          if (changed || templateKey(r3) === "custom" && !r3.documentBody) r3 = await amendDocument(r3, edited, "Legal Manager");
        }
        if (r3.resolutionWorkflow && document.getElementById("verify-source-draft")?.checked) r3 = await verifyResolutionDraft(r3);
      }
      await performApproval(act, r3, comments);
      demoDocument(r3.id);
      toast(act === "approval-approve" ? "Approved PDF generated. President email handoff prepared; not sent." : ["approval-send", "approval-legal"].includes(act) ? "Saved for Legal review." : act === "approval-revise" ? "Returned for revision. No SC number consumed." : "Rejected. No SC number consumed.");
    } catch (err) {
      demoDocument(r3.id, err.message);
    }
    return;
  }
  if (act === "new") newDraft();
  else if (act === "type-start") newDraft(el2.dataset.type);
  else if (act === "select-type") {
    if (draft.type !== el2.dataset.type) {
      draft.values = { ...profileValues() };
      attachments = [];
    }
    draft.type = el2.dataset.type;
    errors = [];
    saveDraft(draft);
    wizard();
  } else if (act === "clear-filters") {
    filters = { search: "", company: "", type: "", status: "", date: "" };
    requests();
  } else if (act === "back") {
    errors = [];
    confirmed = false;
    if (draft.step === 3 && draft.part > 0) draft.part--;
    else if (draft.step === 4) {
      draft.step = 3;
      draft.part = groupsFor(typeBy(draft.type), draft.values).length - 1;
    } else draft.step--;
    saveDraft(draft);
    wizard();
    window.scrollTo(0, 0);
  } else if (act === "edit") {
    draft.step = Number(el2.dataset.step);
    draft.part = 0;
    if (el2.dataset.title === "Additional Information" || el2.dataset.title === "Attachments") draft.part = groupsFor(typeBy(draft.type), draft.values).length - 1;
    confirmed = false;
    errors = [];
    saveDraft(draft);
    wizard();
    window.scrollTo(0, 0);
  } else if (act === "remove-file") {
    attachments.splice(Number(el2.dataset.index), 1);
    document.getElementById("files-list").innerHTML = fileList();
  } else if (act === "document") go2("#document/" + el2.dataset.id);
  else if (act === "download-attachment") {
    const r3 = getRequests().find((r4) => r4.id === el2.dataset.id);
    const file = r3?.attachments?.[Number(el2.dataset.index)];
    if (!file?.data) return;
    const a3 = document.createElement("a");
    a3.href = file.data;
    a3.download = file.name;
    a3.click();
  } else if (act === "continue") {
    const t3 = typeBy(draft.type);
    errors = [];
    if (draft.step === 1) {
      if (!t3) return;
      draft.step = 2;
    } else if (draft.step === 2) {
      errors = validate(generalFields(draft.values, draft.type), draft.values);
      if (!errors.length) {
        draft.step = 3;
        draft.part = 0;
      }
    } else if (draft.step === 3) {
      const groups = groupsFor(t3, draft.values);
      errors = validate(groups[draft.part].fields, draft.values);
      if (!errors.length) {
        if (draft.part < groups.length - 1) draft.part++;
        else draft.step = 4;
      }
    } else if (draft.step === 4) {
      if (!confirmed) return;
      errors = validate([...generalFields(draft.values, draft.type), ...allFields(t3, draft.values).filter((f3) => !common.some((c3) => c3.key === f3.key))], draft.values);
      if (!errors.length) {
        el2.disabled = true;
        el2.textContent = "Saving request\u2026";
        try {
          const allowed = [...generalFields(draft.values, draft.type), ...allFields(t3, draft.values)].flatMap((f3) => [f3.key, f3.key + "Other"]);
          const values = withCompanyDefaults({ ...Object.fromEntries(Object.entries(draft.values).filter(([k3]) => allowed.includes(k3))), ...selectedProfile() ? { department: selectedProfile().department, company: selectedProfile().company, companyCode: selectedProfile().code } : {} });
          lastSubmitted = draft.editingId ? await reviseRequest(getRequests().find((r3) => r3.id === draft.editingId), values, attachments) : await submitRequest({ type: draft.type, values, attachments, requesterProfile: selectedProfile()?.id || "current" });
          clearDraft();
          draft = { type: "", values: {}, step: 1, part: 0 };
          attachments = [];
          confirmed = false;
          go2("#success");
          return;
        } catch (err) {
          errors = [err.message];
        }
      }
    }
    saveDraft(draft);
    wizard();
    window.scrollTo(0, 0);
    if (errors.length) {
      const err = app.querySelector(".error");
      err?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }
});
document.getElementById("menu").onclick = () => {
  const nav = document.querySelector("nav");
  nav.classList.toggle("open");
  document.getElementById("menu").setAttribute("aria-expanded", nav.classList.contains("open"));
};
document.getElementById("notifications").onclick = () => {
  const rows = visibleRequests();
  if (currentRole() !== "requester") {
    toast(legalNotifications(rows, currentRole()).text);
    return;
  }
  const ready = rows.filter((r3) => canonicalStatus(r3) === "Document Ready").length, waiting = rows.filter((r3) => canonicalStatus(r3) === "For Clarification").length;
  toast(`${waiting} request${waiting === 1 ? "" : "s"} need a response \xB7 ${ready} document${ready === 1 ? "" : "s"} ready.`);
};
function collectTemplateFields() {
  const values = {};
  for (const el2 of app.querySelectorAll("[data-template-field]")) values[el2.dataset.templateField] = el2.value.trim();
  const template = document.getElementById("document-template")?.value;
  if (template) values.documentCategory = template === "deed" ? "Deed of Absolute Sale" : "Secretary\u2019s Certificate";
  return { values, template };
}
async function saveCurrentSourceDraft(r3) {
  const fields = collectTemplateFields(), editor = document.getElementById("document-editor");
  if (editor) {
    r3 = await updateTemplateFields(r3, fields.values, fields.template, currentRole() === "assistant" ? "Legal Assistant" : "Legal Manager");
    if (editor.value !== editor.dataset.originalBody) r3 = await amendDocument(r3, editor.value, currentRole() === "assistant" ? "Legal Assistant" : "Legal Manager");
  }
  return r3;
}
async function handleResolutionAction(action, el2) {
  try {
    if (action === "resolution-wording-preview") {
      collectIntake();
      intake.confirmed = false;
      saveIntake();
      certificateWizard();
    } else if (action === "resolution-search") {
      collectIntake();
      if (!document.getElementById("certificate-intake").reportValidity()) return;
      intake.searched = true;
      intake.selected = "";
      intake.confirmed = false;
      saveIntake();
      certificateWizard();
    } else if (action === "resolution-pick") {
      collectIntake();
      const match = matchResolutions(intake.values).matches.find((m3) => m3.resolution.id === el2.dataset.resolution);
      if (!match) throw new Error("Refresh matching results for the current company and category.");
      if (intake.selected !== match.resolution.id) {
        delete intake.values.requestedAction;
        delete intake.values.requestCounterparty;
      }
      intake.selected = match.resolution.id;
      intake.searched = true;
      intake.confirmed = false;
      saveIntake();
      certificateWizard();
    } else if (action === "resolution-unmatched") {
      await submitCertificate(false);
    } else if (action === "resolution-apply") {
      requireView("assistant", "manager");
      const r3 = getRequests().find((r4) => r4.id === el2.dataset.id);
      const updated = await linkResolution(r3, document.getElementById("request-resolution").value, currentRole() === "assistant" ? "Legal Assistant" : "Legal Manager");
      demoDocument(updated.id);
      toast("Source snapshot applied. Verify the draft before sending.");
    } else if (action === "resolution-verify") {
      requireView("assistant", "manager");
      if (!document.getElementById("verify-source-draft")?.checked) throw new Error("Check the source and draft verification statement first.");
      let r3 = getRequests().find((r4) => r4.id === el2.dataset.id);
      r3 = await saveCurrentSourceDraft(r3);
      await verifyResolutionDraft(r3);
      demoDocument(r3.id);
      toast("Source and draft verification recorded in this browser.");
    }
  } catch (err) {
    toast(err.message);
  }
}
async function submitCertificate(confirmedSource = true) {
  requireView("requester");
  collectIntake();
  const form = document.getElementById("certificate-intake");
  if (!form.reportValidity()) return;
  const values = intake.values;
  if (!categories.some((c3) => c3.id === values.resolutionCategory)) throw new Error("Select one of the five categories.");
  let source = null;
  if (confirmedSource) {
    if (!intake.confirmed) throw new Error("Confirm the correct resolution first.");
    source = resolutionBy(intake.selected);
    if (!source || source.company !== values.companyCode) throw new Error("Select a source from this company.");
    if (!source.clauses.trim()) throw new Error("The source has no extracted clauses. Send it to Legal for identification.");
  }
  const result = matchResolutions(values);
  let requestValues = withCompanyDefaults({ ...values, company: findCompany(values)?.name || values.companyCode, documentCategory: "Secretary\u2019s Certificate", purpose: values.context || categoryLabel(values.resolutionCategory) });
  if (source) requestValues = linkedValues(requestValues, source);
  const payload = { type: "certificate", values: requestValues, displayType: categoryLabel(values.resolutionCategory), requesterProfile: "current", resolutionWorkflow: true, resolutionConfirmed: !!source, matchState: source ? "Confirmed" : result.ambiguous ? "Ambiguous" : "Needs Legal identification", resolutionCandidates: result.matches.map((m3) => m3.resolution.id), resolutionSnapshot: source ? resolutionSnapshot(source) : null, sourceVerification: false, documentTemplate: "custom", documentBody: source?.clauses || null };
  lastSubmitted = await submitRequest(payload);
  intake = { values: {}, selected: "", searched: false, confirmed: false };
  saveIntake();
  go2("#success");
}
app.addEventListener("submit", async (event) => {
  if (!["certificate-intake", "resolution-metadata"].includes(event.target.id)) return;
  event.preventDefault();
  const button = event.target.querySelector('button[type="submit"]');
  try {
    if (button) button.disabled = true;
    if (event.target.id === "certificate-intake") await submitCertificate(true);
    else {
      requireView("assistant", "manager");
      const values = Object.fromEntries(new FormData(event.target));
      values.persons = String(values.persons || "").split(/\n|,/).map((x3) => x3.trim()).filter(Boolean);
      const verified = values.verified === "on";
      delete values.verified;
      saveResolution(event.target.dataset.id, values, verified);
      app.innerHTML = libraryPage(event.target.dataset.id);
      toast("Metadata saved. Original file and name preserved.");
    }
  } catch (err) {
    toast(err.message);
  } finally {
    if (button?.isConnected) button.disabled = false;
  }
});
function rememberEditor() {
  const editor = document.getElementById("document-editor");
  if (editor) editor.dataset.originalBody = editor.value;
}
function previewRecord(r3) {
  if (!r3 || ["Approved", "Reserved", "Rejected"].includes(r3.approvalState) || !document.getElementById("document-template")) return r3;
  const fields = collectTemplateFields(), editor = document.getElementById("document-editor");
  const record = { ...r3, documentTemplate: fields.template || r3.documentTemplate, values: { ...r3.values, ...fields.values } };
  if (editor && editor.value !== editor.dataset.originalBody) record.documentBody = editor.value;
  return record;
}
async function renderPDFPreview(r3) {
  const target = document.getElementById("template-pdf-preview");
  if (!target) return;
  const generation = ++previewGeneration;
  try {
    const blob = r3.approvalState === "Approved" && r3.templateVersion === "2026-10-05" && r3.finalPDF ? r3.finalPDF : (await renderTemplatePDF(r3)).blob;
    if (generation !== previewGeneration || !target.isConnected) return;
    await renderPDFPages(blob, target, () => generation === previewGeneration && target.isConnected);
  } catch (err) {
    if (generation === previewGeneration && target.isConnected) target.innerHTML = `<p class="approval-error">${esc2(err.message)}</p>`;
  }
}
function emailSettings() {
  if (currentRole() !== "manager") {
    app.innerHTML = "<p>President email settings are available in Legal Manager view.</p>";
    return;
  }
  app.innerHTML = `<div class="breadcrumbs"><a href="#home">Home</a><span>/</span>President email handoff</div><section class="panel email-settings"><h1>President email handoff</h1><p>Legal Manager approval generates a PDF and prepares an email for the President.</p><div class="field"><label for="president-email">President email address</label><input id="president-email" type="email" value="${esc2(presidentEmail())}" placeholder="Enter the confirmed email address"></div><button class="btn primary" data-action="save-email-settings">Save recipient</button><p class="role-note">The sending account is not connected. Approved requests include a downloadable email draft with the PDF attached. No email is sent by this prototype.</p><a href="#home">Back to home</a></section>`;
}
document.getElementById("view-switch").addEventListener("change", (e7) => {
  setRole(e7.target.value);
  homeStage = "";
  render();
});
window.addEventListener("hashchange", render);
setApprovalChangeHandler(() => {
  if (location.hash !== "#new" && location.hash !== "#draft-document") render();
});
app.innerHTML = '<p class="sub">Loading requests...</p>';
Promise.all([initializeResolutions(), initializeTemplates()]).then(async () => {
  initializeWorkflowSamples();
  await seedRegister(samples, legacyRequests());
  clearLegacyRequests();
  render();
}).catch((err) => {
  render();
  toast("Workflow storage unavailable: " + err.message);
});
app.addEventListener("submit", (e7) => {
  if (e7.target.id !== "company-form") return;
  e7.preventDefault();
  try {
    requireView("assistant", "manager");
    const row = Object.fromEntries(new FormData(e7.target));
    const company = saveCompany(row);
    app.innerHTML = companySetupPage(company.code);
    toast("Company details saved.");
  } catch (err) {
    toast(err.message);
  }
});
