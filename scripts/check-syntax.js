/** Parse-check every JavaScript file without executing application code. */
const { readdirSync } = require("node:fs");
const { join, relative } = require("node:path");
const { spawnSync } = require("node:child_process");

const root = join(__dirname, "..");
const files = [];

function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (entry.name.endsWith(".js")) files.push(path);
  }
}

collect(join(root, "src"));
collect(join(root, "scripts"));

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stderr.write(`\n${relative(root, file)}\n${result.stderr}`);
    process.exitCode = 1;
  }
}

if (!process.exitCode)
  console.log(`Đã kiểm tra cú pháp ${files.length} tệp JavaScript.`);
