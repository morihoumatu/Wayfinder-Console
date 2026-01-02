/**
 * lintレポートのスタイル定義をまとめる。
 * @file lintレポートのスタイル定義をまとめる。
 */
const REPORT_STYLE = `
:root {
  color-scheme: light;
}
body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background: #f6f7fb;
  color: #1f2933;
  margin: 0;
  padding: 24px;
}
header {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  margin-bottom: 24px;
}
h1 {
  margin: 0 0 8px;
  font-size: 1.8rem;
}
.summary {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 8px;
  font-weight: 600;
}
.summary span {
  background: #eef2ff;
  color: #3730a3;
  padding: 6px 12px;
  border-radius: 999px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}
th,
td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb;
}
th {
  background: #f8fafc;
}
.status-ok td {
  color: #1b5e20;
}
.status-fail td {
  color: #b71c1c;
  font-weight: 600;
}
.tool {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  margin: 20px 0;
}
.tool-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.tool-header h2 {
  margin: 0;
  font-size: 1.4rem;
}
.tool-command {
  font-family: "Consolas", "Courier New", monospace;
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 4px;
}
.tool-status {
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 700;
}
.tool-status.status-ok {
  background: #dcfce7;
  color: #166534;
}
.tool-status.status-fail {
  background: #fee2e2;
  color: #991b1b;
}
.tool-counts {
  margin: 12px 0 18px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-weight: 600;
}
.file-block {
  margin-bottom: 12px;
}
.file-block summary {
  cursor: pointer;
  font-weight: 600;
  padding: 6px 0;
}
.messages {
  margin-top: 8px;
}
.severity-error {
  color: #b91c1c;
}
.severity-warning {
  color: #b45309;
}
.tool-error {
  margin: 12px 0;
  color: #b91c1c;
  font-weight: 600;
}
.clean {
  color: #166534;
  font-weight: 600;
}
pre {
  background: #0f172a;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 0.85rem;
}
`;

module.exports = {
  REPORT_STYLE,
};
