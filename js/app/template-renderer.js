/* template-renderer.js — Fills {{placeholders}} and lays out the certificate. */
var fontBytes = /* @__PURE__ */ new Map();
function fileFor(family, style) {
  return `fonts/${family}-${style}.${family === "tahoma" ? "ttf" : "otf"}`;
}
async function bytes(family, style) {
  const key = family + "-" + style;
  if (!fontBytes.has(key)) fontBytes.set(key, fetch(fileFor(family, style)).then((r3) => {
    if (!r3.ok) throw new Error("A template font could not be loaded.");
    return r3.arrayBuffer();
  }));
  return fontBytes.get(key);
}
async function renderTemplatePDF(r3) {
  await initializeTemplates();
  const model = templateModel(r3);
  if (!model) throw new Error("No supplied template matches this document category.");
  if (!globalThis.PDFLib || !globalThis.fontkit) throw new Error("The document renderer has not loaded. Reload and retry.");
  const { PDFDocument: PDFDocument2, rgb } = globalThis.PDFLib;
  const pdf = await PDFDocument2.create();
  pdf.registerFontkit(globalThis.fontkit);
  const fonts = /* @__PURE__ */ new Map();
  const initial = templateBlocks(r3);
  for (const block of initial) {
    const runs = block.kind === "table" ? block.rows.flatMap((row) => row.flatMap((cell) => cell.paragraphs.flatMap((p3) => p3.runs))) : block.runs;
    for (const run of runs) {
      const family = run.family || "arial", style = (run.bold ? "bold" : "") + (run.italic ? "italic" : "") || "regular", key = family + "-" + style;
      if (!fonts.has(key)) fonts.set(key, await pdf.embedFont(await bytes(family, style), { subset: false }));
    }
  }
  function font(run) {
    return fonts.get((run.family || "arial") + "-" + ((run.bold ? "bold" : "") + (run.italic ? "italic" : "") || "regular"));
  }
  const page = model.page, W3 = page.page_width, H3 = page.page_height, LEFT = page.left_margin, RIGHT = page.right_margin, TOP = page.top_margin, BOTTOM = page.bottom_margin, contentWidth = W3 - LEFT - RIGHT;
  let layout;
  function calculate(blocks) {
    const pages = [[]];
    let pageIndex = 0, y3 = TOP;
    function newPage() {
      pages.push([]);
      pageIndex++;
      y3 = TOP;
    }
    function add(op) {
      pages[pageIndex].push(op);
    }
    function lines(p3, width) {
      const runs = p3.runs;
      const tokens2 = [];
      for (const run of runs) for (const part of run.text.split(/(\n|\t| +)/)) {
        if (!part) continue;
        tokens2.push({ ...run, text: part, width: part === "\n" || part === "	" ? 0 : font(run).widthOfTextAtSize(part, run.size) });
      }
      const result = [];
      let current = [], used = 0, lineIndex = 0;
      const available = () => Math.max(35, width - (lineIndex === 0 ? p3.first : 0));
      function flush(forced = false) {
        result.push({ tokens: current, width: used, forced });
        current = [];
        used = 0;
        lineIndex++;
      }
      for (const token of tokens2) {
        if (token.text === "\n") {
          flush(true);
          continue;
        }
        if (token.text === "	") {
          const next = (Math.floor(used / 36) + 1) * 36;
          current.push({ ...token, text: " ", width: next - used });
          used = next;
          continue;
        }
        if (!current.length && /^ +$/.test(token.text)) {
          current.push(token);
          used += token.width;
          continue;
        }
        if (used + token.width > available() && current.length && !/^ +$/.test(token.text)) {
          while (current.length && /^ +$/.test(current.at(-1).text)) {
            used -= current.pop().width;
          }
          flush();
        }
        if (token.width > available()) {
          let part = "";
          for (const ch2 of token.text) {
            if (font(token).widthOfTextAtSize(part + ch2, token.size) > available() && part) {
              const width2 = font(token).widthOfTextAtSize(part, token.size);
              current.push({ ...token, text: part, width: width2 });
              used += width2;
              flush();
              part = "";
            }
            part += ch2;
          }
          if (part) {
            const width2 = font(token).widthOfTextAtSize(part, token.size);
            current.push({ ...token, text: part, width: width2 });
            used += width2;
          }
        } else {
          if (!current.length && /^ +$/.test(token.text) && result.length) continue;
          current.push(token);
          used += token.width;
        }
      }
      if (current.length || !result.length) flush();
      return result;
    }
    function paragraph(p3, x3, width, localY, draw = true, allowBreak = true) {
      const availableWidth = width - p3.left - p3.right;
      const ls2 = lines(p3, availableWidth);
      const size = Math.max(...p3.runs.map((r4) => r4.size || 11));
      const height = (font(p3.runs[0]).heightAtSize(size, { descender: true }) || size * 1.15) * p3.line;
      let yy = localY + p3.before;
      if (allowBreak && p3.pageBreak && yy > TOP) {
        newPage();
        yy = y3;
      }
      const fullHeight = ls2.length * height + p3.before + p3.after;
      if (allowBreak && (p3.keep || p3.keepNext || model.id === "deed") && yy + fullHeight > H3 - BOTTOM && fullHeight < H3 - TOP - BOTTOM) {
        newPage();
        yy = y3 + p3.before;
      }
      ls2.forEach((line, index) => {
        if (allowBreak && yy + height > H3 - BOTTOM) {
          newPage();
          yy = y3;
        }
        let start = x3 + p3.left + (index === 0 ? p3.first : 0);
        const aw = availableWidth - (index === 0 ? p3.first : 0);
        if (p3.align === "center") start += (aw - line.width) / 2;
        if (p3.align === "right") start += aw - line.width;
        const spaces = line.tokens.filter((t3) => /^ +$/.test(t3.text)).length;
        const extra2 = p3.align === "justify" && !line.forced && index < ls2.length - 1 && spaces ? Math.max(0, (aw - line.width) / spaces) : 0;
        for (const token of line.tokens) {
          if (draw && token.text.trim()) add({ kind: "text", x: start, y: yy + size, text: token.text, run: token });
          start += token.width + (/^ +$/.test(token.text) ? extra2 : 0);
        }
        yy += height;
      });
      return yy + p3.after;
    }
    for (const block of blocks) {
      if (block.kind === "paragraph") {
        y3 = paragraph(block, LEFT, contentWidth, y3);
        continue;
      }
      let widths = block.widths.slice(), total = widths.reduce((a3, b3) => a3 + b3, 0);
      const left = Math.max(0, Math.min(block.left, contentWidth - 50));
      if (total > contentWidth - left) widths = widths.map((w3) => w3 * (contentWidth - left) / total);
      for (const row of block.rows) {
        const heights = row.map((cell, i3) => cell.paragraphs.reduce((h3, p3) => paragraph({ ...p3, left: 0, right: 0 }, 0, widths[i3] - 8, h3, false, false), 0) + 8);
        const rh = Math.max(14, ...heights);
        if (y3 + rh > H3 - BOTTOM) {
          newPage();
        }
        let x3 = LEFT + left;
        for (let i3 = 0; i3 < row.length; i3++) {
          add({ kind: "rect", x: x3, y: y3, width: widths[i3], height: rh, fill: row[i3].fill });
          let yy = y3 + 4;
          for (const p3 of row[i3].paragraphs) yy = paragraph({ ...p3, left: 0, right: 0 }, x3 + 4, widths[i3] - 8, yy, true, false);
          x3 += widths[i3];
        }
        y3 += rh;
      }
      y3 += 6;
    }
    while (pages.length > 1 && !pages.at(-1).length) pages.pop();
    return pages;
  }
  layout = calculate(initial);
  layout = calculate(templateBlocks(r3, layout.length));
  for (let i3 = 0; i3 < layout.length; i3++) {
    const sheet = pdf.addPage([W3, H3]);
    if (model.deedHeader && i3 > 0) {
      const regular = fonts.get("arial-regular") || [...fonts.values()][0];
      sheet.drawText(`${i3 + 1} | Page`, { x: LEFT, y: H3 - 28, size: 9, font: regular, color: rgb(0.4, 0.4, 0.4) });
      sheet.drawText("Deed of Absolute Sale", { x: LEFT, y: H3 - 43, size: 8, font: regular, color: rgb(0.5, 0.5, 0.5) });
      sheet.drawLine({ start: { x: LEFT, y: H3 - 55 }, end: { x: W3 - RIGHT, y: H3 - 55 }, thickness: 0.35, color: rgb(0.85, 0.85, 0.85) });
    }
    for (const op of layout[i3]) {
      if (op.kind === "rect") {
        const fill = op.fill && /^[0-9a-f]{6}$/i.test(op.fill) ? rgb(parseInt(op.fill.slice(0, 2), 16) / 255, parseInt(op.fill.slice(2, 4), 16) / 255, parseInt(op.fill.slice(4, 6), 16) / 255) : void 0;
        sheet.drawRectangle({ x: op.x, y: H3 - op.y - op.height, width: op.width, height: op.height, borderColor: rgb(0, 0, 0), borderWidth: 0.5, ...fill ? { color: fill } : {} });
      } else {
        sheet.drawText(op.text, { x: op.x, y: H3 - op.y, size: op.run.size, font: font(op.run), color: rgb(0, 0, 0) });
        if (op.run.underline) sheet.drawLine({ start: { x: op.x, y: H3 - op.y - 1.2 }, end: { x: op.x + op.run.width, y: H3 - op.y - 1.2 }, thickness: 0.5, color: rgb(0, 0, 0) });
      }
    }
  }
  pdf.setTitle(model.id === "deed" ? "Deed of Absolute Sale" : "Secretary\u2019s Certificate");
  pdf.setSubject(r3.id);
  return { blob: new Blob([await pdf.save()], { type: "application/pdf" }), pageCount: layout.length, layout, model };
}
