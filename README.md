# Northbridge Legal Request Portal

A browser-based prototype of a **Secretary's Certificate request workflow** for a corporate legal team: a requester asks for a certificate, the system finds the Board Resolution that authorizes it, Legal verifies and approves it, and a numbered certificate is generated from an approved template.

> **Portfolio demo.** All companies, people, IDs and documents are fictional. It is an anonymized replica of a workflow I designed and built for a real legal department. SharePoint, email sending and a shared database are simulated; data stays in your browser.

**Live demo:** https://lykabuilds.github.io/northbridge-legal-portal/

## The problem

Secretary's Certificates were drafted by hand from Board Resolutions stored in SharePoint. Requesters re-typed details the resolution already contained, Legal searched folders by filename, and certificate numbers were tracked manually. The real department expects 300+ certificates a year.

## How it works

1. **Request.** The requester enters only their name, company, needed-by date, one of five categories and optional context. Nothing that already exists in the resolution is asked again.
2. **Match.** The portal searches the **contents** of the resolution library, not just filenames: company first, then category, subject, transaction purpose and named persons. The requester confirms the right resolution. Ambiguous or unmatched requests go to the Legal Assistant.
3. **Draft.** A certificate is generated from the confirmed resolution and the approved template. The resolution wording is carried over exactly.
4. **Verify and approve.** Legal Assistant verifies the source and draft, then the Legal Manager approves, returns for revision or rejects.
5. **Number.** On approval the certificate gets an SC number such as `HMC-SC-2026-10-0001`: company prefix, one chronological sequence per month shared across all companies, reset monthly, duplicates blocked.

### Three role views
Switch roles from the **View** menu in the sidebar: **Requestor**, **Legal Assistant**, **Legal Manager**.

### Safeguards
- **Never invents data.** A resolution whose date cannot be established is shown as `DATE-UNVERIFIED` and cannot be approved until Legal confirms the date from evidence.
- **Originals are preserved.** The library proposes standard filenames (`COMPANY_BR_YYYY-MM-DD_SHORT-SUBJECT.docx`) but never renames files without approval.
- **Human in the loop.** The system matches and drafts; people verify and approve.
- **Numbers are only used on approval.** Drafts, returns and rejections never consume an SC number.

## Try it

| Sample | What it shows |
|---|---|
| `LR-2026-0201` · HMC | Verified and waiting for the Legal Manager. Approve it to issue an SC number. |
| `LR-2026-0202` · SMI | Dividend declaration whose source date is `DATE-UNVERIFIED`; approval is blocked. |
| `LR-2026-0203` · AFI | Returned to the requester for clarification. |

To start fresh, clear this site's data in your browser.

## Project structure

```
index.html              Page shell (sidebar, notice, main area)
css/portal.css          Workflow component styles
css/northbridge.css     Northbridge theme and layout
js/app/                 Application modules, loaded in order as plain scripts
  resolutions.js        Library, filename convention, content matching
  numbering.js          Request store (IndexedDB), workflow steps, SC numbering
  resolution-ui.js      Library pages and the request/matching screen
  template-renderer.js  Fills {{placeholders}} in certificate templates
  pdf.js, documents.js  PDF and Word output
  approval-ui.js        Approval panel and SC register
  main.js               Router and event handling
js/vendor/              pdf-lib, fontkit, fflate, pdf.js
resolutions/            Sample Board Resolutions (fictional) + library.json
templates/              Certificate templates (.docx) and layout models
fonts/                  Open-licensed fonts for PDF output
```

No build step and no server code: it is static HTML, CSS and JavaScript.

## Run locally

Browsers block `fetch()` from `file://`, so serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## What a production version would connect

| Prototype | Production |
|---|---|
| Sample resolution library in `resolutions/` | SharePoint document library via Microsoft Graph |
| Browser storage (IndexedDB / localStorage) | Shared database (SharePoint List or SQL) |
| Email draft prepared, not sent | Power Automate / Outlook send |
| Role switcher | Microsoft Entra ID sign-in and roles |

## Tech

Vanilla JavaScript, IndexedDB, [pdf-lib](https://pdf-lib.js.org/), [pdf.js](https://mozilla.github.io/pdf.js/), [fflate](https://github.com/101arrowz/fflate), [fontkit](https://github.com/foliojs/fontkit). See `THIRD_PARTY_NOTICES.md`.

---
Built by **Lyka Marie Ganotisi** · [LinkedIn](https://linkedin.com/in/lykaganotisi) · [GitHub](https://github.com/lykabuilds)
