/* companies.js — Company setup: codes, legal names, President, address; CSV import/export. */
var KEY = "nb.legal.companies.v1";
function companies() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]").sort((a3, b3) => a3.code.localeCompare(b3.code));
  } catch {
    return [];
  }
}
function findCompany(values) {
  const code = String(values.companyCode || "").trim().toUpperCase(), name = String(values.company || "").trim().toLowerCase();
  return companies().find((c3) => code && c3.code === code || c3.code.toLowerCase() === name || c3.name.toLowerCase() === name);
}
function companyDefaults(values) {
  const c3 = findCompany(values);
  if (!c3) return {};
  return { company: c3.name, companyCode: c3.code, legalCompanyName: c3.name, companyAddress: c3.address, presidentName: c3.president, presidentEmail: c3.email };
}
function withCompanyDefaults(values) {
  const defaults = companyDefaults(values), result = { ...defaults, ...values };
  for (const key of ["legalCompanyName", "companyAddress", "presidentName", "presidentEmail", "companyCode"]) if (!result[key]) result[key] = defaults[key] || "";
  return result;
}
function validateCompany(row) {
  const c3 = { code: String(row.code || "").trim().toUpperCase(), name: String(row.name || "").trim(), president: String(row.president || "").trim(), email: String(row.email || "").trim(), address: String(row.address || "").trim() };
  if (!/^[A-Z][A-Z0-9]{1,11}$/.test(c3.code)) throw new Error("Company abbreviation must contain 2\u201312 letters/numbers and start with a letter.");
  if (!c3.name || !c3.president || !c3.address) throw new Error("Enter the company name, President name and company address.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c3.email)) throw new Error("Enter a valid President email address for " + c3.code + ".");
  return c3;
}
function write(rows) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}
function saveCompany(row) {
  requireView("assistant", "manager");
  const c3 = validateCompany(row);
  const rows = companies().filter((x3) => x3.code !== c3.code);
  rows.push(c3);
  write(rows);
  return c3;
}
function parseCSV(text2) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i3 = 0; i3 < text2.length; i3++) {
    const ch2 = text2[i3];
    if (ch2 === '"') {
      if (quoted && text2[i3 + 1] === '"') {
        cell += '"';
        i3++;
      } else if (quoted) quoted = false;
      else if (!cell) quoted = true;
      else throw new Error("Invalid CSV quotation.");
    } else if (ch2 === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((ch2 === "\n" || ch2 === "\r") && !quoted) {
      if (ch2 === "\r" && text2[i3 + 1] === "\n") i3++;
      row.push(cell);
      if (row.some((x3) => x3.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch2;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(cell);
  if (row.some((x3) => x3.trim())) rows.push(row);
  return rows;
}
var headers = ["CompanyName", "CompanyCode", "PresidentName", "PresidentEmail", "CompanyAddress"];
function importCompanies(text2) {
  requireView("assistant", "manager");
  const rows = parseCSV(text2.replace(/^\uFEFF/, ""));
  const head = rows.shift();
  if (!head || headers.some((h3) => !head.includes(h3))) throw new Error("CSV must include: " + headers.join(", "));
  if (!rows.length) throw new Error("The CSV has no company records.");
  const mapped = rows.map((row, i3) => {
    if (row.length !== head.length) throw new Error("Check the columns on CSV row " + (i3 + 2) + ".");
    const value = (h3) => row[head.indexOf(h3)];
    return validateCompany({ name: value("CompanyName"), code: value("CompanyCode"), president: value("PresidentName"), email: value("PresidentEmail"), address: value("CompanyAddress") });
  });
  if (new Set(mapped.map((c3) => c3.code)).size !== mapped.length) throw new Error("The CSV has duplicate company abbreviations.");
  const result = new Map(companies().map((c3) => [c3.code, c3]));
  for (const c3 of mapped) result.set(c3.code, c3);
  write([...result.values()]);
  return mapped.length;
}
function downloadCompanyCSV(template = false) {
  requireView("assistant", "manager");
  const quote = (v3) => '"' + String(v3).replaceAll('"', '""') + '"';
  const rows = template ? [] : companies().map((c3) => [c3.name, c3.code, c3.president, c3.email, c3.address]);
  const csv = [headers.join(","), ...rows.map((r3) => r3.map(quote).join(","))].join("\r\n") + "\r\n";
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a3 = document.createElement("a");
  a3.href = url;
  a3.download = template ? "Company_Setup_Template.csv" : "Company_Setup.csv";
  a3.click();
  setTimeout(() => URL.revokeObjectURL(url), 2e3);
}
