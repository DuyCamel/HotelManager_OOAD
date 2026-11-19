/** Tự sinh từ điển dữ liệu từ schema ứng dụng chuẩn; không cần SQL Server hoặc .env. */
const fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
const schema = fs.readFileSync(
  path.join(root, "database/HotelManagerOOAD.sql"),
  "utf8",
);
// Đọc cặp ngoặc và phân tách cột ở depth=0, giữ dấu phẩy trong decimal/computed/default.
function balanced(text, start) {
  let depth = 1,
    quote = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === "'") {
      if (quote && text[i + 1] === "'") {
        i++;
        continue;
      }
      quote = !quote;
    }
    if (quote) continue;
    if (c === "(") depth++;
    if (c === ")" && --depth === 0) return i;
  }
  throw Error("DDL thiếu dấu đóng ngoặc.");
}
function split(text) {
  let depth = 0,
    quote = false,
    last = 0,
    out = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'") {
      if (quote && text[i + 1] === "'") {
        i++;
        continue;
      }
      quote = !quote;
    }
    if (quote) continue;
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "," && depth === 0) {
      out.push(text.slice(last, i).trim());
      last = i + 1;
    }
  }
  out.push(text.slice(last).trim());
  return out;
}
const tables = [];
const pattern = /CREATE TABLE dbo\.\[?(\w+)\]?\s*\(/g;
let match;
while ((match = pattern.exec(schema))) {
  const end = balanced(schema, pattern.lastIndex);
  const entries = split(schema.slice(pattern.lastIndex, end));
  const columns = entries
    .filter(
      (x) =>
        !/^(?:CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)\b/i.test(x),
    )
    .map((line) => {
      const m = line.match(/^\[?(\w+)\]?\s+([\s\S]+)/);
      if (!m) throw Error("Không đọc được cột: " + line);
      const def = m[2];
      return {
        name: m[1],
        type: /^AS\b/i.test(def)
          ? "computed"
          : def.match(/^\w+(?:\([^)]*\))?/)?.[0],
        nullable: /\bNOT NULL\b/.test(def)
          ? "Không"
          : /^AS\b|\browversion\b/i.test(def)
            ? "Theo SQL Server"
            : "Có",
        pk: /\bPRIMARY KEY\b/.test(def),
        identity: /\bIDENTITY\b/i.test(def),
        definition: def.replace(/\s+/g, " "),
      };
    });
  tables.push({ name: match[1], columns });
  pattern.lastIndex = end + 1;
}
if (!tables.length) throw Error("Không tìm thấy bảng.");
const foreign = [
  ...schema.matchAll(
    /ALTER TABLE dbo\.\[?(\w+)\]?\s+WITH CHECK ADD CONSTRAINT \[?(\w+)\]?\s+FOREIGN KEY\s*\(([^)]+)\)\s+REFERENCES dbo\.\[?(\w+)\]?\s*\(([^)]+)\)/gi,
  ),
  ...schema.matchAll(
    /ALTER TABLE dbo\.\[?(\w+)\]?\s+ADD CONSTRAINT \[?(\w+)\]?\s+FOREIGN KEY\s*\(([^)]+)\)\s+REFERENCES dbo\.\[?(\w+)\]?\s*\(([^)]+)\)/gi,
  ),
];
const esc = (s) => String(s).replace(/\|/g, "\\|");
let md =
  "# Từ điển dữ liệu\n\nTự sinh bằng `npm run docs:dictionary` từ schema ứng dụng chuẩn `database/HotelManagerOOAD.sql`. Không sửa tay file này. `npm run docs:check` kiểm tra tài liệu có còn khớp DDL. Đây là metadata đọc từ script, không phải chứng nhận đã chạy SQL Server.\n\n";
md += `Tổng: **${tables.length} bảng, ${tables.reduce((n, t) => n + t.columns.length, 0)} cột, ${foreign.length} khóa ngoại**.\n\n`;
md +=
  "## Danh sách bảng\n\n| Bảng | Số cột |\n|---|---:|\n" +
  tables.map((t) => `| ${t.name} | ${t.columns.length} |`).join("\n") +
  "\n\n";
for (const table of tables) {
  md += `## ${table.name}\n\n| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |\n|---|---|---|---|---|\n`;
  for (const c of table.columns)
    md += `| ${c.name} | ${c.type} | ${c.nullable} | ${[c.pk ? "PK" : "", c.identity ? "identity" : ""].filter(Boolean).join(", ")} | ${esc(c.definition)} |\n`;
  const fks = foreign.filter((f) => f[1] === table.name);
  if (fks.length)
    md +=
      "\nKhóa ngoại:\n\n" +
      fks.map((f) => `- \`${f[2]}\`: ${f[3]} → ${f[4]}(${f[5]}).`).join("\n") +
      "\n";
  md += "\n";
}
md +=
  "## Trigger, view, function và procedure\n\n| Loại | Object |\n|---|---|\n" +
  [
    ...schema.matchAll(
      /CREATE OR ALTER\s+(TRIGGER|VIEW|FUNCTION|PROCEDURE)\s+dbo\.(\w+)/gi,
    ),
  ]
    .map((m) => `| ${m[1]} | ${m[2]} |`)
    .join("\n") +
  "\n";
const target = path.join(root, "docs/DATABASE_DICTIONARY.md");
if (process.argv.includes("--check")) {
  if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== md) {
    console.error("Từ điển dữ liệu đã lệch. Chạy npm run docs:dictionary.");
    process.exitCode = 1;
  } else console.log("Từ điển dữ liệu khớp DDL.");
} else {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, md);
  console.log("Đã sinh", tables.length, "bảng:", path.relative(root, target));
}
