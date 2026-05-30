const fs = require("fs");
const path = require("path");
const indexPath = path.resolve(__dirname, "../../lib/api-zod/src/index.ts");
const content = fs.readFileSync(indexPath, "utf8");
const patched = content
  .split("\n")
  .filter((line) => !line.includes("generated/types"))
  .join("\n");
fs.writeFileSync(indexPath, patched);
console.log("Patched api-zod index.ts — removed generated/types re-export");
