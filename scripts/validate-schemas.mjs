import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "node:fs";
import path from "node:path";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
const schemasDir = path.resolve("schemas");
const files = fs.readdirSync(schemasDir).filter((f) => f.endsWith(".json"));
let failed = false;
for (const file of files) {
  const schema = JSON.parse(fs.readFileSync(path.join(schemasDir, file), "utf-8"));
  try {
    ajv.compile(schema);
    console.log(`✔ ${file} is valid`);
  } catch (err) {
    console.error(`✘ ${file} is invalid: ${err.message}`);
    failed = true;
  }
}
if (failed) process.exit(1);
