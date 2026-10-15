/* email.js — Prepares the President email handoff (not sent). */
  var KEY5 = "nb.legal.president-email";
  function presidentEmail() {
    try {
      return localStorage.getItem(KEY5) || "";
    } catch {
      return "";
    }
  }
  function setPresidentEmail(value) {
    value = value.trim();
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Enter a valid President email address.");
    try {
      localStorage.setItem(KEY5, value);
    } catch {
      throw new Error("The email address could not be saved.");
    }
  }
  function preparePresidentEmail(r3) {
    r3 = { ...r3, values: withCompanyDefaults(r3.values) };
    const to2 = r3.values.presidentEmail || presidentEmail();
    return { to: to2, subject: `For President review: ${r3.id} - ${r3.values.company}`, body: `Dear President,

Please find attached the document approved by the Legal Manager for ${r3.values.company}.

Request: ${r3.id}
SC Number: ${scnStatus(r3)}

For your review.

Legal Department
Northbridge Group (demo)`, attachment: pdfFilename({ ...r3, approvalState: "Approved" }), status: to2 ? "Awaiting email connection" : "Recipient required", preparedAt: (/* @__PURE__ */ new Date()).toISOString() };
  }
  async function downloadEmailDraft(r3) {
    if (r3.approvalState !== "Approved") throw new Error("Approve this request before preparing the email.");
    if (!r3.finalPDF) r3 = { ...r3, finalPDF: await createPDF(r3) };
    const email = { ...preparePresidentEmail(r3), ...r3.email || {}, to: r3.email?.to || withCompanyDefaults(r3.values).presidentEmail || presidentEmail() || "" };
    if (!email.to) throw new Error("Set the company President email in Company Setup or Legal Manager email settings first.");
    const bytes2 = new Uint8Array(await r3.finalPDF.arrayBuffer());
    let binary = "";
    for (const b3 of bytes2) binary += String.fromCharCode(b3);
    const encoded = btoa(binary).match(/.{1,76}/g).join("\r\n");
    const boundary = "NB_LEGAL_PDF_" + r3.id;
    const subject = "=?UTF-8?B?" + btoa(unescape(encodeURIComponent(email.subject))) + "?=";
    const bodyBytes = new TextEncoder().encode(email.body);
    let bodyBinary = "";
    for (const b3 of bodyBytes) bodyBinary += String.fromCharCode(b3);
    const message = [`To: ${email.to}`, `Subject: ${subject}`, "MIME-Version: 1.0", "X-Unsent: 1", `Content-Type: multipart/mixed; boundary="${boundary}"`, "", `--${boundary}`, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", btoa(bodyBinary), `--${boundary}`, `Content-Type: application/pdf; name="${email.attachment}"`, "Content-Transfer-Encoding: base64", `Content-Disposition: attachment; filename="${email.attachment}"`, "", encoded, `--${boundary}--`, ""].join("\r\n");
    return new Blob([message], { type: "message/rfc822" });
  }
  async function downloadEML(r3) {
    const blob = await downloadEmailDraft(r3), url = URL.createObjectURL(blob), a3 = document.createElement("a");
    a3.href = url;
    a3.download = r3.id + "_PRESIDENT_REVIEW.eml";
    a3.click();
    setTimeout(() => URL.revokeObjectURL(url), 2e3);
  }
