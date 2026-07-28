import { redactSecrets } from "../utils/patterns";
export function redactError(err: Error): string {
  return redactSecrets(err.message);
}
export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj))
    r[k] = typeof v === "string" ? redactSecrets(v) : v;
  return r;
}
