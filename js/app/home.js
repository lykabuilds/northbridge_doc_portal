/* home.js — Requester home. */
var pipelineStages = ["Submitted", "For Legal Review", "Processing", "Document Ready", "Completed"];
var e2 = (v3) => String(v3 ?? "").replace(/[&<>"']/g, (c3) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c3]);
function canonicalStatus(r3) {
  if (r3.status === "Approved") return "Document Ready";
  if (r3.status === "Draft Generated") return "Submitted";
  if (r3.status === "For Revision") return "For Clarification";
  return r3.status;
}
function companyLabel(r3) {
  if (r3.values.companies?.length > 1) return `Multiple (${r3.values.companies.length})`;
  return r3.values.companyCode || r3.values.company;
}
function requestTypeLabel(r3) {
  return r3.displayType || types.find((t3) => t3.id === r3.type)?.short || r3.type;
}
function daysInStage(r3, now2 = Date.now()) {
  return Math.max(0, Math.floor((now2 - new Date(r3.stageEnteredAt || r3.date).getTime()) / 864e5));
}
function pipelineCounts(rows) {
  return Object.fromEntries(pipelineStages.map((s3) => [s3, rows.filter((r3) => canonicalStatus(r3) === s3).length]));
}
function sortedRequests(rows) {
  const priority = (r3) => canonicalStatus(r3) === "For Clarification" ? 0 : canonicalStatus(r3) === "Document Ready" ? 1 : 2;
  return rows.slice().sort((a3, b3) => priority(a3) - priority(b3) || new Date(b3.date) - new Date(a3.date) || a3.id.localeCompare(b3.id));
}
function requestTable(rows, { now: now2 = Date.now(), sort = true, target = "request" } = {}) {
  return `<div class="table-wrap"><table class="request-table"><thead><tr><th>Request ID</th><th>Company</th><th>Request Type</th><th>Submitted</th><th>Status</th><th>Days in stage</th><th>SC Number</th></tr></thead><tbody>${(sort ? sortedRequests(rows) : rows).map((r3) => {
    const days = daysInStage(r3, now2), status = canonicalStatus(r3);
    const cls = status === "For Clarification" ? "clarification" : status === "Document Ready" ? "ready" : "";
    return `<tr tabindex="0" data-request-id="${e2(r3.id)}" data-row-target="${target}" aria-label="Open ${e2(r3.id)}, ${e2(requestTypeLabel(r3))}, ${status}"><td><a class="ref" href="#${target}/${e2(r3.id)}">${e2(r3.id)}</a></td><td>${e2(companyLabel(r3))}</td><td>${e2(requestTypeLabel(r3))}</td><td>${new Date(r3.date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}</td><td><span class="badge ${cls}">${status}</span></td><td><span class="${days > 5 ? "days-overdue" : ""}">${days} ${days === 1 ? "day" : "days"}</span></td><td>${e2(scnStatus(r3))}</td></tr>`;
  }).join("")}</tbody></table>${rows.length ? "" : '<div class="empty">No requests in this stage.</div>'}</div>`;
}
function homePage(rows, stage2 = "") {
  const role2 = currentRole();
  if (role2 !== "requester") return legalHomePage(rows, role2, stage2);
  const counts = pipelineCounts(rows);
  const clarification = rows.filter((r3) => canonicalStatus(r3) === "For Clarification");
  const shown = stage2 ? rows.filter((r3) => canonicalStatus(r3) === stage2) : rows;
  const ready = rows.filter((r3) => canonicalStatus(r3) === "Document Ready");
  return `<div class="home-heading"><div><h1>${views[role2].title}</h1><span class="home-context">${role2 === "requester" ? "Secretary\u2019s Certificate requests" : role2 === "assistant" ? "Review, amend, and prepare documents" : "Review amendments and approve documents"}</span></div>${role2 === "requester" ? '<button class="btn primary" data-action="new">New Secretary&#39;s Certificate Request</button>' : ""}</div><section class="response-section" aria-label="Needs your response"><div class="section-heading"><h2>Needs your response</h2>${clarification.length ? `<span class="section-count">${clarification.length}</span>` : ""}</div>${clarification.length ? `<div class="response-cards">${clarification.map((r3) => `<a class="response-card" href="#request/${e2(r3.id)}"><div class="response-main"><span class="response-reference">${e2(r3.id)}</span><strong>${e2(requestTypeLabel(r3))}</strong><span class="response-company">${e2(companyLabel(r3))}</span><p>${e2(r3.comments || "Legal has requested additional information.")}</p></div><div class="response-action"><span>${daysInStage(r3)} days waiting</span><strong>${role2 === "requester" ? "Respond" : "Review clarification"} <span aria-hidden="true">\u2192</span></strong></div></a>`).join("")}</div>` : '<p class="nothing-waiting">Nothing needs your response.</p>'}</section>${ready.length ? `<section class="ready-downloads"><div class="section-heading"><h2>Ready to download</h2><span class="section-count">${ready.length}</span></div>${ready.map((r3) => `<div class="ready-download-row"><div><a class="ref" href="#document/${e2(r3.id)}">${e2(r3.id)}</a><strong>${e2(requestTypeLabel(r3))}</strong><span>${e2(companyLabel(r3))}${r3.values.department ? " \xB7 " + e2(r3.values.department) : ""} \xB7 ${e2(scnStatus(r3))}${r3.departmentExample ? " \xB7 Sample document" : ""}</span></div><div class="legal-action-row"><button class="btn primary" data-action="download-pdf" data-id="${e2(r3.id)}">Download approved PDF</button><button class="btn" data-action="download-docx" data-id="${e2(r3.id)}">Download Word</button></div></div>`).join("")}</section>` : ""}<section class="pipeline-section" aria-label="Request pipeline"><div class="section-heading"><h2>Request pipeline</h2><button class="text-button ${stage2 ? "" : "selected"}" data-action="home-stage" data-stage="" aria-pressed="${!stage2}">All requests (${rows.length})</button></div><div class="pipeline-bar">${pipelineStages.map((s3, i3) => `<button class="pipeline-stage ${s3 === "Document Ready" ? "stage-ready" : ""} ${stage2 === s3 ? "selected" : ""}" data-action="home-stage" data-stage="${s3}" aria-pressed="${stage2 === s3}"><span class="pipeline-count">${counts[s3]}</span><span class="pipeline-label">${s3}</span>${i3 < 4 ? '<span class="pipeline-chevron" aria-hidden="true">\u203A</span>' : ""}</button>`).join("")}</div></section><section class="panel home-table"><div class="panel-head"><h2>${stage2 ? e2(stage2) + " requests" : "Recent requests"}</h2><div class="table-actions">${stage2 ? '<button class="text-button" data-action="home-stage" data-stage="">Clear filter</button>' : ""}<a href="#requests">${role2 === "requester" ? "My Requests" : "All requests"} \u2192</a></div></div>${requestTable(shown)}<div class="table-foot"><span>${shown.length} of ${rows.length} requests${stage2 ? " \xB7 " + e2(stage2) : ""}</span><span>${rows.every((r3) => r3.sample) ? "Sample requests" : "Browser workspace"}</span></div></section>${role2 === "manager" ? '<div class="email-handoff-note"><span>President email delivery</span><span>PDF email handoff is prepared after approval. Sending account not connected.</span><a href="#email-settings">Set recipient \u2192</a></div>' : ""}`;
}
