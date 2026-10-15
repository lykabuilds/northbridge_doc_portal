/* resolution-fields.js — Finds the President and variable action/agency phrases inside a resolution; binds request wording. */
function extractPresident(text2 = "") {
  const lines = String(text2).split(/\r?\n/).map((x3) => x3.trim()).filter(Boolean), candidates = [];
  for (let i3 = 1; i3 < lines.length; i3++) if (/^(?:(?:chairman|chairperson)\s*\/\s*)?president\b/i.test(lines[i3])) {
    const name = lines[i3 - 1].replace(/\s+/g, " ").trim();
    if (/^[A-ZÀ-ž .,'’\-]+$/i.test(name) && !/(?:\bTIN\b|\d|RESOLVED|DIRECTOR|VICE.?PRESIDENT)/i.test(name)) candidates.push({ name, evidence: lines[i3 - 1] + "\n" + lines[i3] });
  }
  const unique = [...new Map(candidates.map((x3) => [x3.name.toUpperCase(), x3])).values()];
  return unique.length === 1 ? unique[0] : { name: "", evidence: "President not unambiguously identified in this resolution." };
}
var sourcePresident = (source) => extractPresident(source?.sourceText || "");
function resolutionVariableFields(source) {
  const clauses = source?.clauses || "";
  const found = clauses.match(/management to (.+?)((?:DEPARTMENT|BUREAU|SECURITIES|SOCIAL SECURITY|PHILIPPINE)[A-Z\s,.-]+\([A-Z0-9-]+\))(?=;)/);
  const action = source?.actionSourceText || found?.[1]?.trimEnd() || "", counterparty = source?.counterpartySourceText || found?.[2] || "";
  return { action: clauses.includes(action) ? action : "", counterparty: clauses.includes(counterparty) ? counterparty : "" };
}
function requestVariableValues(values, source) {
  const defaults = resolutionVariableFields(source);
  return { requestedAction: values.requestedAction ?? defaults.action, requestCounterparty: values.requestCounterparty ?? defaults.counterparty };
}
var escapeRE = (s3) => s3.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function bindResolutionText(text2, source, values = {}) {
  const fields = resolutionVariableFields(source), pairs = [[fields.action, "{{RequestedAction}}"], [fields.counterparty, "{{RequestCounterparty}}"]].filter(([from]) => from);
  if (!pairs.length) return text2;
  const lookup = new Map(pairs);
  return text2.replace(new RegExp(pairs.map(([from]) => escapeRE(from)).sort((a3, b3) => b3.length - a3.length).join("|"), "g"), (match) => lookup.get(match));
}
function renderResolutionText(text2, source, values = {}) {
  const v3 = requestVariableValues(values, source);
  return bindResolutionText(text2, source).replace(/\{\{RequestedAction\}\}/g, () => v3.requestedAction).replace(/\{\{RequestCounterparty\}\}/g, () => v3.requestCounterparty);
}
function bindDraftBody(text2, source, values = {}, previous = {}) {
  const fields = resolutionVariableFields(source), current = requestVariableValues(values, source), old = requestVariableValues(previous, source);
  const pairs = [[fields.action, "{{RequestedAction}}"], [fields.counterparty, "{{RequestCounterparty}}"], ...fields.action ? [[current.requestedAction, "{{RequestedAction}}"], [old.requestedAction, "{{RequestedAction}}"]] : [], ...fields.counterparty ? [[current.requestCounterparty, "{{RequestCounterparty}}"], [old.requestCounterparty, "{{RequestCounterparty}}"]] : []].filter(([from]) => String(from || "").trim());
  const lookup = new Map(pairs), pattern = pairs.map(([from]) => escapeRE(from)).sort((a3, b3) => b3.length - a3.length).join("|");
  if (!pattern) return text2;
  return text2.split(/(\{\{\w+\}\})/).map((part) => /^\{\{\w+\}\}$/.test(part) ? part : part.replace(new RegExp("(?<![a-zA-Z0-9])(?:" + pattern + ")(?![a-zA-Z0-9])", "g"), (match) => lookup.get(match))).join("");
}
