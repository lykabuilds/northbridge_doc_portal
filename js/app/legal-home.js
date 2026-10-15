/* legal-home.js — Legal Assistant / Manager home queues. */
var e3 = (v3) => String(v3 ?? "").replace(/[&<>"']/g, (c3) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c3]);
var state = (r3) => r3.approvalState || "Assistant Review";
var oldest = (rows) => rows.slice().sort((a3, b3) => new Date(a3.stageEnteredAt || a3.date) - new Date(b3.stageEnteredAt || b3.date) || a3.id.localeCompare(b3.id));
function assistantQueues(rows) {
  const active = rows.filter((r3) => !["Approved", "Reserved", "Rejected", "For Approval", "For Revision"].includes(state(r3)) && !["Completed", "Document Ready", "Rejected", "For Clarification"].includes(canonicalStatus(r3)));
  const responses = active.filter((r3) => r3.requesterResponse && canonicalStatus(r3) === "For Legal Review");
  return { new: active.filter((r3) => !responses.includes(r3) && ["Submitted", "For Legal Review"].includes(canonicalStatus(r3))), responses, preparation: active.filter((r3) => canonicalStatus(r3) === "Processing"), manager: rows.filter((r3) => state(r3) === "For Approval"), clarification: rows.filter((r3) => state(r3) === "For Revision" || canonicalStatus(r3) === "For Clarification") };
}
function managerQueues(rows) {
  return { approval: rows.filter((r3) => state(r3) === "For Approval"), reserved: rows.filter((r3) => state(r3) === "Reserved"), clarification: rows.filter((r3) => state(r3) === "For Revision" || canonicalStatus(r3) === "For Clarification"), approved: rows.filter((r3) => state(r3) === "Approved") };
}
function pendingHandoffs(rows) {
  return rows.filter((r3) => state(r3) === "Approved" && canonicalStatus(r3) !== "Completed" && !["Sent", "Delivered"].includes(r3.email?.status));
}
var section = (title, rows, cards, empty) => `<section class="legal-home-section"><div class="section-heading"><h2>${title}</h2>${rows.length ? `<span class="section-count">${rows.length}</span>` : ""}</div>${rows.length ? `<div class="legal-work-cards">${cards}</div>` : `<p class="nothing-waiting">${empty}</p>`}</section>`;
function card(r3, { label, note, href = "#document/", amber = false, green = false } = {}) {
  const days = daysInStage(r3);
  return `<a class="legal-work-card ${amber ? "needs-action" : ""} ${green ? "document-ready" : ""}" href="${href}${e3(r3.id)}"><div class="legal-work-main"><div class="legal-work-meta"><span class="response-reference">${e3(r3.id)}</span><span>${e3(companyLabel(r3))}</span></div><strong>${e3(requestTypeLabel(r3))}</strong><p>${e3(note)}</p></div><div class="legal-work-action"><span class="${days > 5 ? "days-overdue" : ""}">${days} ${days === 1 ? "day" : "days"} in stage</span><strong>${e3(label)} \u2192</strong></div></a>`;
}
function queueBar(queues, labels, selected, defaultLabel) {
  return `<section class="pipeline-section" aria-label="Legal work stages"><div class="section-heading"><h2>Work queue</h2><button class="text-button ${selected ? "" : "selected"}" data-action="home-stage" data-stage="" aria-pressed="${!selected}">${defaultLabel}</button></div><div class="pipeline-bar legal-queue-bar">${Object.entries(labels).map(([key, label]) => `<button class="pipeline-stage ${selected === key ? "selected" : ""}" data-action="home-stage" data-stage="${key}" aria-pressed="${selected === key}"><span class="pipeline-count">${queues[key].length}</span><span class="pipeline-label">${label}</span></button>`).join("")}</div></section>`;
}
function queueTable(rows, title, filter, allCount) {
  return `<section class="panel home-table"><div class="panel-head"><h2>${e3(title)}</h2><div class="table-actions">${filter ? '<button class="text-button" data-action="home-stage" data-stage="">Clear filter</button>' : ""}<a href="#requests">All requests \u2192</a></div></div>${requestTable(oldest(rows), { sort: false, target: "document" })}<div class="table-foot"><span>${rows.length} ${rows.length === 1 ? "request" : "requests"} in this queue</span><span>${allCount} requests in browser workspace</span></div></section>`;
}
function legalHomePage(rows, role2, filter = "") {
  if (role2 === "assistant") {
    const q4 = assistantQueues(rows), labels2 = { new: "New requests", responses: "Responses received", preparation: "In preparation", manager: "With Manager", clarification: "Awaiting requester" };
    const active = [...q4.new, ...q4.responses, ...q4.preparation], selected2 = labels2[filter] ? filter : "", shown2 = selected2 ? q4[selected2] : active;
    return `<div class="home-heading"><div><h1>Legal preparation queue</h1><span class="home-context">Legal Assistant</span></div><a class="btn" href="#companies">Company Setup</a></div>${section("Requester responses received", q4.responses, oldest(q4.responses).map((r3) => card(r3, { label: "Review response", note: r3.requesterResponse })).join(""), "No requester responses waiting for review.")}${section("New requests to prepare", q4.new, oldest(q4.new).map((r3) => card(r3, { label: "Prepare document", note: r3.values.purpose || "Review the submitted details and prepare the draft." })).join(""), "No new requests waiting for preparation.")}${queueBar(q4, labels2, selected2, `My work (${active.length})`)}${queueTable(shown2, selected2 ? labels2[selected2] : "Documents to prepare & amend", selected2, rows.length)}`;
  }
  const q3 = managerQueues(rows), labels = { approval: "Awaiting approval", reserved: "Generation pending", clarification: "Returned for clarification", approved: "Approved" }, selected = labels[filter] ? filter : "", shown = selected ? q3[selected] : [...q3.approval, ...q3.reserved], handoffs = pendingHandoffs(rows);
  return `<div class="home-heading"><div><h1>Legal approval queue</h1><span class="home-context">Legal Manager</span></div><a class="btn" href="#companies">Company Setup</a></div>${section("Awaiting your approval", q3.approval, oldest(q3.approval).map((r3) => card(r3, { label: "Review & approve", note: r3.amendedBy ? `${r3.amendedBy} \xB7 Document version ${r3.documentVersion || 1} \xB7 ${r3.amendedAt ? "Amended " + new Date(r3.amendedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" }) : "Amendments saved"}` : "Submitted for Legal Manager review. No amendments recorded." })).join(""), "Nothing is waiting for your approval.")}${q3.reserved.length ? section("Document generation needs attention", q3.reserved, oldest(q3.reserved).map((r3) => card(r3, { label: "Retry generation", note: `${scnStatus(r3)} \xB7 Reservation retained; final document generation is pending.`, amber: true })).join(""), "") : ""}${queueBar(q3, labels, selected, `My review queue (${q3.approval.length + q3.reserved.length})`)}${queueTable(shown, selected ? labels[selected] : "Requests to review", selected, rows.length)}${section("President email handoffs", handoffs, oldest(handoffs).map((r3) => card(r3, { label: "Open PDF & email handoff", note: `${scnStatus(r3)} \xB7 ${r3.email?.status || "Handoff not prepared"} \xB7 Not sent`, green: true })).join(""), "No approved documents awaiting a President email handoff.")}<p class="role-home-note">President emails require a connected sending account. <a href="#companies">Company recipients</a> \xB7 <a href="#email-settings">Fallback recipient</a></p>`;
}
function legalNotifications(rows, role2) {
  if (role2 === "assistant") {
    const q4 = assistantQueues(rows);
    return { count: q4.new.length + q4.responses.length + q4.preparation.length, text: `${q4.new.length} new requests \xB7 ${q4.responses.length} requester responses \xB7 ${q4.preparation.length} documents in preparation` };
  }
  const q3 = managerQueues(rows), handoffs = pendingHandoffs(rows);
  return { count: q3.approval.length + q3.reserved.length + handoffs.length, text: `${q3.approval.length} awaiting approval \xB7 ${q3.reserved.length} generation pending \xB7 ${handoffs.length} President email handoffs` };
}
