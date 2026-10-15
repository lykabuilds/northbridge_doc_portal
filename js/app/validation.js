/* validation.js — Form validation helpers. */
function validate(fields, values) {
  const errors2 = [];
  for (const f3 of fields) {
    const value = values[f3.key];
    if (f3.key === "companyCode" && value && !/^[A-Z][A-Z0-9]{1,11}$/.test(value)) errors2.push("Company Code must be 2\u201312 uppercase letters or digits, starting with a letter.");
    if (!f3.optional && (!value || Array.isArray(value) && !value.length)) errors2.push(`${f3.label} is required.`);
    if (f3.type === "number" && value !== void 0 && value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0)) errors2.push(`${f3.label} must be a valid non-negative amount.`);
    if (f3.type === "date" && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors2.push(`${f3.label} must be a valid date.`);
    if ((value === "Other" || value === "Other Government Agency" || Array.isArray(value) && value.includes("Other")) && !String(values[f3.key + "Other"] || "").trim()) errors2.push(`Please specify Other for ${f3.label}.`);
  }
  return errors2;
}
