/* templates.js — Loads certificate templates and their layout models. */
var models = {};
var loaded;
var byteCache = /* @__PURE__ */ new Map();
async function initializeTemplates() {
  if (!loaded) loaded = fetch("templates/models.json").then((r3) => {
    if (!r3.ok) throw new Error("The legal templates could not be loaded.");
    return r3.json();
  }).then((x3) => models = x3);
  await loaded;
}
var templateLabels = { supplier: "Secretary\u2019s Certificate \u2014 supplier engagement", government: "Secretary\u2019s Certificate \u2014 government authority", dividend: "Secretary\u2019s Certificate \u2014 cash dividend", deed: "Deed of Absolute Sale \u2014 motor vehicle", custom: "Secretary\u2019s Certificate \u2014 custom resolution" };
function templateKey(r3) {
  if (r3.documentTemplate) return r3.documentTemplate;
  if (!isCertificate(r3)) return r3.type === "asset" ? "deed" : null;
  if (r3.type === "supplier") return "supplier";
  if (r3.type === "government") return "government";
  if (r3.type === "dividend" && (!r3.values.dividendType || r3.values.dividendType === "Cash Dividend")) return "dividend";
  return "custom";
}
function templateModel(r3) {
  const key = templateKey(r3);
  return key ? models[key === "custom" ? "supplier" : key] : null;
}
var fmtDate = (date3) => date3 ? (/* @__PURE__ */ new Date(date3 + "T12:00:00")).toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" }) : "";
var ordinal = (n3) => n3 + (n3 % 100 >= 11 && n3 % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n3 % 10] || "th");
var longDate = (date3) => {
  if (!date3) return "";
  const d3 = /* @__PURE__ */ new Date(date3 + "T12:00:00");
  return `${ordinal(d3.getDate())} day of ${d3.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}`;
};
var small = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
var tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
function numberWords(n3) {
  if (n3 < 20) return small[n3];
  if (n3 < 100) return tens[Math.floor(n3 / 10)] + (n3 % 10 ? " " + small[n3 % 10] : "");
  if (n3 < 1e3) return small[Math.floor(n3 / 100)] + " HUNDRED" + (n3 % 100 ? " " + numberWords(n3 % 100) : "");
  for (const [value, name] of [[1e12, "TRILLION"], [1e9, "BILLION"], [1e6, "MILLION"], [1e3, "THOUSAND"]]) if (n3 >= value) return numberWords(Math.floor(n3 / value)) + " " + name + (n3 % value ? " " + numberWords(n3 % value) : "");
  return "";
}
function moneyWords(value, currency2 = "PHP") {
  if (value === void 0 || value === "") return "";
  const amount3 = Number(value);
  if (!Number.isFinite(amount3) || amount3 < 0 || amount3 >= 1e13) return "";
  const cents = Math.round(amount3 * 100), whole = Math.floor(cents / 100);
  const unit = { PHP: "PESOS", USD: "US DOLLARS", EUR: "EUROS", GBP: "POUNDS", JPY: "YEN", SGD: "SINGAPORE DOLLARS" }[currency2];
  if (!unit) return "";
  return `${numberWords(whole)} ${unit} AND ${String(cents % 100).padStart(2, "0")}/100`;
}
var amount2 = (v3) => v3 === void 0 || v3 === "" ? "" : Number(v3).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function templateValues(r3, pageCount = 3) {
  const v3 = withCompanyDefaults(r3.values), key = templateKey(r3);
  const date3 = v3.executionDate || "";
  return { SourceResolution: !!r3.resolutionWorkflow, ResolutionSource: r3.resolutionSnapshot, ResolutionRequestValues: r3.values, GoverningBody: v3.governingBody || "", CompanyName: v3.legalCompanyName || v3.company || "", CompanyAddress: v3.companyAddress || "", BoardMeetingDate: fmtDate(v3.boardDate), SecretaryName: v3.secretaryName || v3.corporateSecretary || "ATTY. RAFAEL C. DOMINGO", SecretaryID: v3.secretaryID || "00-1234567-8", PresidentName: r3.resolutionWorkflow ? sourcePresident(r3.resolutionSnapshot).name : v3.presidentName || "", ExecutionDateLong: longDate(date3), ExecutionCity: v3.executionCity || "", Year: date3 ? date3.slice(0, 4) : "", SCNumber: scnPreview({ ...r3, values: v3 }), IncludeRate: hasSeparateRate(v3), ThirdPartyEngagement: v3.serviceType || "", ThirdPartyName: v3.thirdPartyName || "", ThirdPartyScope: v3.scope || "", Currency: v3.currency || "", TotalAmount: amount2(v3.totalAmount), FundingSource: v3.sourceOfFunds === "Other" ? v3.sourceOfFundsOther || "" : v3.sourceOfFunds || "", AmountRate: amount2(v3.rate), AmountAllocation: v3.paymentBasis === "Other" ? v3.paymentBasisOther || "" : v3.paymentBasis || "", GovernmentAgency: v3.agency === "Other Government Agency" ? v3.agencyOther || "" : v3.agency || "", AgencyOffice: v3.agencyBranch || "", TransactionPurpose: v3.transactionPurpose || "", SignatoryPosition: v3.signatoryPosition || "", AuthorizedSignatory: v3.authorizedSignatory || "", AuthorizedRepresentative: v3.authorizedRepresentative || "", AmountInWords: moneyWords(key === "deed" ? v3.saleAmount : v3.dividendAmount, v3.currency), DividendAmount: amount2(v3.dividendAmount), RecordDate: fmtDate(v3.recordDate), SellerPosition: v3.sellerPosition || "", SellerSignatory: v3.sellerSignatory || "", BuyerName: v3.buyerName || "", BuyerNationality: v3.buyerNationality || "", BuyerAddress: v3.buyerAddress || "", SaleAmount: amount2(v3.saleAmount), VATBasis: v3.vatInclusive === "Yes" ? "VAT Inclusive" : v3.vatInclusive === "No" ? "VAT Exclusive" : "", VehicleModel: v3.vehicleModel || "", ChassisNumber: v3.chassisNumber || "", EngineNumber: v3.engineNumber || "", FileNumber: v3.fileNumber || "", PlateNumber: v3.plateNumber || "", PageCount: String(pageCount), PageCountWords: numberWords(pageCount).toLowerCase() };
}
function hasSeparateRate(v3) {
  return v3.rate !== void 0 && String(v3.rate).trim() !== "" && !["flat rate", "one-time payment"].includes(String(v3.paymentBasis === "Other" ? v3.paymentBasisOther : v3.paymentBasis).trim().toLowerCase());
}
var sourcePreamble = "I, {{SecretaryName}}, in my capacity as Corporate Secretary of {{CompanyName}}, with principal office address at {{CompanyAddress}}, do hereby certify that the following resolution was adopted by the {{GoverningBody}} on {{BoardMeetingDate}}, to wit:";
function fillText(text2, values) {
  if (values.SourceResolution && values.ResolutionSource) text2 = renderResolutionText(text2, values.ResolutionSource, values.ResolutionRequestValues);
  if (values.SourceResolution && text2.includes("I, {{SecretaryName}}")) text2 = sourcePreamble;
  if (!values.SourceResolution && !values.IncludeRate) text2 = text2.replace(/ at the rate of (?:\{\{Currency\}\}|[A-Z]{3}) (?:\{\{AmountRate\}\}|[\d,.]+)\/(?:\{\{AmountAllocation\}\}|[^;\n]+)(?=;|$)/g, "");
  return text2.replace(/\{\{(\w+)\}\}/g, (m3, k3) => values[k3] !== void 0 && values[k3] !== "" ? String(values[k3]) : m3);
}
function requestResolutionDraft(r3) {
  const type = types.find((t3) => t3.id === r3.type);
  if (!type) return r3.values.certificateAuthority || r3.values.purpose || "";
  const fields = allFields(type, r3.values).filter((f3) => !["requestor", "company", "boardDate", "additional", "corporateSecretary"].includes(f3.key));
  const rows = fields.flatMap((f3) => {
    let value = r3.values[f3.key];
    if (Array.isArray(value)) value = value.join("; ");
    if (value === "Other" || value === "Other Government Agency") value = r3.values[f3.key + "Other"] || value;
    return value !== void 0 && String(value).trim() ? [f3.label + ": " + value] : [];
  });
  return rows.length ? "REQUESTED AUTHORIZATION \u2014 FOR LEGAL REVIEW\n\n" + rows.join("\n\n") : "";
}
function templateResolutionText(r3) {
  if (r3.resolutionWorkflow && !r3.resolutionSnapshot) return "";
  const model = templateModel(r3);
  if (!model) return r3.documentBody || "";
  if (r3.documentBody) return fillText(r3.documentBody, templateValues(r3));
  if (templateKey(r3) === "custom") return requestResolutionDraft(r3);
  return model.blocks.filter((b3) => b3.resolution).map((b3) => fillText(b3.runs.map((x3) => x3.text).join(""), templateValues(r3))).join("\n\n");
}
function templateBlocks(r3, pageCount = 3) {
  if (r3.resolutionWorkflow && !r3.resolutionSnapshot) throw new Error("Legal must identify and confirm the source resolution before draft generation.");
  const model = templateModel(r3);
  if (!model) throw new Error("No supplied template covers this document category. Select a Secretary\u2019s Certificate or motor vehicle Deed of Sale template in Legal view.");
  const values = templateValues(r3, pageCount);
  let replaced = false;
  return model.blocks.flatMap((block) => {
    if (block.resolution && (r3.documentBody || templateKey(r3) === "custom")) {
      if (replaced) return [];
      replaced = true;
      const text2 = r3.documentBody || requestResolutionDraft(r3) || "{{ResolutionText}}";
      const first = block.runs[0] || { family: "tahoma", size: 11 };
      return text2.split(/\n\s*\n/).map((t3, i3) => ({ ...block, runs: [{ ...first, text: fillText(t3, values), bold: false }], keep: false, keepNext: false, id: "resolution-" + i3 }));
    }
    if (block.kind === "table") return [{ ...block, rows: block.rows.map((row) => row.map((cell) => ({ ...cell, paragraphs: cell.paragraphs.map((p3) => ({ ...p3, runs: fillRuns(p3.runs, values) })) }))) }];
    return [{ ...block, runs: fillRuns(block.runs, values) }];
  });
}
function fillRuns(runs, values) {
  const full = runs.map((r3) => r3.text).join("");
  if (values.SourceResolution && full.includes("I, {{SecretaryName}}")) return [{ ...runs[0], text: fillText(full, values) }];
  const matches = [...full.matchAll(/ at the rate of \{\{Currency\}\} \{\{AmountRate\}\}\/\{\{AmountAllocation\}\}|\{\{\w+\}\}/g)];
  if (!matches.length) return runs.map((r3) => ({ ...r3 }));
  const result = [];
  let offset = 0;
  for (const run of runs) {
    let t3 = run.text;
    const start = offset, end = offset + t3.length;
    offset = end;
    let cursor = 0;
    for (const match of matches) {
      const a3 = match.index, b3 = a3 + match[0].length;
      if (b3 <= start || a3 >= end) continue;
      const localA = Math.max(0, a3 - start), localB = Math.min(t3.length, b3 - start);
      if (localA > cursor) result.push({ ...run, text: t3.slice(cursor, localA) });
      if (a3 >= start) result.push({ ...run, text: fillText(match[0], values) });
      cursor = localB;
    }
    if (cursor < t3.length) result.push({ ...run, text: t3.slice(cursor) });
  }
  return result;
}
function missingTemplateFields(r3) {
  if (r3.resolutionWorkflow && !r3.resolutionSnapshot) return ["Confirmed source resolution"];
  const model = templateModel(r3);
  if (!model) return ["A matching document template"];
  const values = templateValues(r3);
  const text2 = JSON.stringify(templateBlocks(r3));
  const missing = [...new Set([...text2.matchAll(/\{\{(\w+)\}\}/g)].map((m3) => m3[1]))].filter((x3) => x3 !== "SCNumber");
  if (templateKey(r3) === "custom" && !r3.documentBody) missing.push("Legal-reviewed resolution clauses");
  if (templateKey(r3) === "deed" && r3.values.assetType !== "Motor Vehicle") missing.push("Motor vehicle asset type");
  if (templateKey(r3) === "dividend" && r3.values.dividendType !== "Cash Dividend") missing.push("Cash dividend type");
  return missing;
}
function validateTemplate(r3) {
  const missing = missingTemplateFields(r3);
  if (missing.length) throw new Error("Complete the template fields before approval: " + missing.join(", "));
}
function templateFields(r3) {
  r3 = { ...r3, values: withCompanyDefaults(r3.values) };
  const key = templateKey(r3), base = [["legalCompanyName", "Company legal name", "text"], ["companyAddress", "Company registered address", "textarea"], ["executionDate", "Document signing date", "date"], ["executionCity", "Signing city / place", "text"]];
  if (r3.resolutionWorkflow) base.push(["governingBody", "Governing body from resolution", "text"]);
  if (r3.resolutionWorkflow) {
    const variableFields = resolutionVariableFields(r3.resolutionSnapshot);
    if (variableFields.action) base.push(["requestedAction", "Requested action", "textarea"]);
    if (variableFields.counterparty) base.push(["requestCounterparty", "Agency / counterparty (updates all mapped mentions)", "text"]);
  }
  base.push(["presidentEmail", "President email for handoff", "email"]);
  if (key !== "deed") base.push(["companyCode", "Company abbreviation / SC prefix", "text"], ["boardDate", "Board meeting date", "date"], ["secretaryName", "Corporate Secretary", "text"], ["secretaryID", "Corporate Secretary identification number", "text"]);
  if (["supplier", "custom", "dividend"].includes(key)) base.push(["presidentName", "President name for attestation", "text"]);
  if (key === "supplier") base.push(["serviceType", "Service / engagement", "text"], ["thirdPartyName", "Third party name", "text"], ["scope", "Scope of work", "textarea"], ["currency", "Currency code", "text"], ["totalAmount", "Total amount", "number"], ["sourceOfFunds", "Funding source", "text"], ["rate", "Amount / rate", "number"], ["paymentBasis", "Payment / allocation basis", "text"]);
  if (key === "government") base.push(["agency", "Government agency", "text"], ["agencyBranch", "Office / RDO", "text"], ["transactionPurpose", "Transaction purpose", "textarea"], ["signatoryPosition", "Signatory position", "text"], ["authorizedSignatory", "Authorized signatory", "text"], ["authorizedRepresentative", "Authorized representative", "text"]);
  if (key === "dividend") base.push(["dividendType", "Dividend type", "text"], ["currency", "Currency code", "text"], ["dividendAmount", "Dividend amount", "number"], ["recordDate", "Stockholders record date", "date"]);
  if (key === "deed") base.push(["assetType", "Asset type", "text"], ["sellerPosition", "Seller representative position", "text"], ["sellerSignatory", "Seller signatory", "text"], ["buyerName", "Buyer name", "text"], ["buyerNationality", "Buyer nationality", "text"], ["buyerAddress", "Buyer address", "textarea"], ["currency", "Currency code", "text"], ["saleAmount", "Sale amount", "number"], ["vatInclusive", "VAT inclusive? (Yes / No)", "text"], ["vehicleModel", "Model / make / series", "text"], ["chassisNumber", "Chassis number", "text"], ["engineNumber", "Engine number", "text"], ["fileNumber", "File number", "text"], ["plateNumber", "Plate number", "text"]);
  return base.map(([key2, label, type]) => ({ key: key2, label: key2 === "presidentName" && r3.resolutionWorkflow ? "President name \xB7 from Board Resolution" : label, type, readonly: key2 === "presidentName" && r3.resolutionWorkflow, value: key2 === "presidentName" && r3.resolutionWorkflow ? sourcePresident(r3.resolutionSnapshot).name : ["requestedAction", "requestCounterparty"].includes(key2) && r3.resolutionWorkflow ? requestVariableValues(r3.values, r3.resolutionSnapshot)[key2] : r3.values[key2] || (key2 === "legalCompanyName" ? r3.values.company || "" : key2 === "secretaryName" ? r3.values.corporateSecretary || "ATTY. RAFAEL C. DOMINGO" : key2 === "secretaryID" ? "00-1234567-8" : "") }));
}
async function templateDocx(r3, pageCount) {
  await initializeTemplates();
  const model = templateModel(r3);
  if (!model) throw new Error("No matching supplied Word template is configured.");
  if (!globalThis.fflate) throw new Error("The Word template exporter is unavailable.");
  const key = model.id;
  if (!byteCache.has(key)) byteCache.set(key, fetch("templates/" + key + ".docx").then((x3) => x3.arrayBuffer()));
  const files = fflate.unzipSync(new Uint8Array(await byteCache.get(key)));
  const xml = new DOMParser().parseFromString(fflate.strFromU8(files["word/document.xml"]), "application/xml");
  const W3 = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const paragraphs = [...xml.getElementsByTagNameNS(W3, "body")[0].children].filter((n3) => n3.localName === "p");
  const values = templateValues(r3, pageCount);
  let inserted = false;
  for (let i3 = 0; i3 < paragraphs.length; i3++) {
    const p3 = paragraphs[i3], block = model.blocks.find((b3) => b3.kind === "paragraph" && b3.id === i3);
    if (block?.resolution && (r3.documentBody || templateKey(r3) === "custom")) {
      if (inserted) {
        p3.remove();
        continue;
      }
      inserted = true;
      const text2 = fillText(r3.documentBody || requestResolutionDraft(r3) || "{{ResolutionText}}", values);
      const existing = [...p3.children].find((x3) => x3.localName === "r"), props = existing?.getElementsByTagNameNS(W3, "rPr")[0]?.cloneNode(true);
      for (const child of [...p3.children]) if (child.localName !== "pPr") child.remove();
      const run = xml.createElementNS(W3, "w:r");
      if (props) run.appendChild(props);
      text2.split("\n").forEach((line, j3) => {
        if (j3) run.appendChild(xml.createElementNS(W3, "w:br"));
        const node = xml.createElementNS(W3, "w:t");
        node.textContent = line;
        node.setAttribute("xml:space", "preserve");
        run.appendChild(node);
      });
      p3.appendChild(run);
    }
  }
  for (const p3 of [...xml.getElementsByTagNameNS(W3, "p")]) {
    if (values.SourceResolution) {
      const ts2 = [...p3.getElementsByTagNameNS(W3, "t")];
      if (ts2.map((t3) => t3.textContent).join("").includes("I, {{SecretaryName}}")) {
        ts2[0].textContent = sourcePreamble;
        for (const t3 of ts2.slice(1)) t3.textContent = "";
      }
    }
    const nodes = [...p3.getElementsByTagNameNS(W3, "t")], runs = nodes.map((n3) => ({ text: n3.textContent })), filled = fillRuns(runs, values);
    const text2 = nodes.map((n3) => n3.textContent).join("");
    if (!/\{\{\w+\}\}/.test(text2)) continue;
    const matches = [...text2.matchAll(/ at the rate of \{\{Currency\}\} \{\{AmountRate\}\}\/\{\{AmountAllocation\}\}|\{\{(\w+)\}\}/g)].reverse();
    for (const m3 of matches) {
      let offset = 0;
      const ranges = nodes.map((n3) => {
        const a3 = offset;
        offset += n3.textContent.length;
        return { n: n3, a: a3, b: offset };
      });
      let done = false;
      for (const { n: n3, a: a3, b: b3 } of ranges) {
        if (b3 <= m3.index || a3 >= m3.index + m3[0].length) continue;
        const value = n3.textContent, prefix = a3 <= m3.index ? value.slice(0, m3.index - a3) : "", suffix = b3 >= m3.index + m3[0].length ? value.slice(m3.index + m3[0].length - a3) : "";
        n3.textContent = prefix + (done ? "" : fillText(m3[0], values)) + suffix;
        n3.setAttribute("xml:space", "preserve");
        done = true;
      }
    }
  }
  files["word/document.xml"] = fflate.strToU8(new XMLSerializer().serializeToString(xml));
  return new Blob([fflate.zipSync(files, { level: 6 })], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
