import * as core from "@actions/core";
import { parseInputs } from "./inputs";
import { run } from "./run";
async function main(): Promise<void> {
  try {
    const inputs = parseInputs();
    await run(inputs);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const redacted = message
      .replace(/ghp_[A-Za-z0-9]{36}/g, "[REDACTED]")
      .replace(/sk-[A-Za-z0-9]{20,}/g, "[REDACTED]")
      .replace(/AKIA[0-9A-Z]{16}/g, "[REDACTED]");
    core.setFailed(`BioTrace failed: ${redacted}`);
  }
}
main();
