/** Client-side export helpers: CSV, Excel (.xls), PDF (print) */

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ];
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

/** Excel-compatible HTML spreadsheet (.xls) — opens in Excel / LibreOffice */
export function downloadExcel(
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const th = headers
    .map(
      (h) =>
        `<th style="background:#1e293b;color:#fff;padding:8px;border:1px solid #ccc;text-align:left">${escapeHtml(h)}</th>`
    )
    .join("");
  const trs = rows
    .map(
      (r) =>
        `<tr>${r
          .map(
            (c) =>
              `<td style="padding:6px 8px;border:1px solid #ddd">${escapeHtml(String(c ?? ""))}</td>`
          )
          .join("")}</tr>`
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body>
<h2>${escapeHtml(title)}</h2>
<p>Generated: ${new Date().toLocaleString("en-GB")}</p>
<table border="1" cellspacing="0" cellpadding="4">
<thead><tr>${th}</tr></thead>
<tbody>${trs}</tbody>
</table>
</body></html>`;
  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const name = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  triggerDownload(blob, name);
}

/** Open printable report window — user can Save as PDF */
export function downloadPdf(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  summary?: { label: string; value: string | number }[]
) {
  const th = headers
    .map(
      (h) =>
        `<th style="background:#1e293b;color:#fff;padding:8px;border:1px solid #334155;font-size:12px;text-align:left">${escapeHtml(h)}</th>`
    )
    .join("");
  const trs = rows
    .map(
      (r, i) =>
        `<tr style="background:${i % 2 ? "#f8fafc" : "#fff"}">${r
          .map(
            (c) =>
              `<td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:12px">${escapeHtml(String(c ?? ""))}</td>`
          )
          .join("")}</tr>`
    )
    .join("");
  const summaryHtml = summary?.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:12px;margin:16px 0">
        ${summary
          .map(
            (s) =>
              `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 16px;min-width:120px">
                <div style="font-size:11px;color:#64748b">${escapeHtml(s.label)}</div>
                <div style="font-size:18px;font-weight:700;color:#0f172a">${escapeHtml(String(s.value))}</div>
              </div>`
          )
          .join("")}
      </div>`
    : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @media print { body { margin: 12mm; } .no-print { display: none !important; } }
  body { font-family: system-ui, sans-serif; color: #0f172a; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  .btn { background:#2563eb;color:#fff;border:0;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;margin-right:8px; }
</style></head>
<body>
  <div class="no-print" style="margin-bottom:16px">
    <button class="btn" onclick="window.print()">Print / Save as PDF</button>
    <button class="btn" style="background:#64748b" onclick="window.close()">Close</button>
  </div>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">Kaveri Metallising · Generated ${new Date().toLocaleString("en-GB")}</div>
  ${summaryHtml}
  <table>
    <thead><tr>${th}</tr></thead>
    <tbody>${trs}</tbody>
  </table>
  <script>setTimeout(function(){ window.print(); }, 400);<\/script>
</body></html>`;

  const w = window.open("", "_blank", "noopener,noreferrer,width=1000,height=700");
  if (!w) {
    alert("Please allow pop-ups to export PDF");
    return;
  }
  w.document.write(html);
  w.document.close();
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatDateExport(d: string) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d).slice(0, 10);
    return dt.toLocaleDateString("en-GB");
  } catch {
    return String(d).slice(0, 10);
  }
}
