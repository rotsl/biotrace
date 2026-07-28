export const CREDENTIAL_PATTERNS = [
  /(?:password|passwd|pwd)\s*[:=]\s*\S+/gi,
  /(?:secret|token|key|api_key|apikey)\s*[:=]\s*\S+/gi,
  /(?:Bearer|Basic)\s+[A-Za-z0-9+/=_-]+/gi,
  /ghp_[A-Za-z0-9]{36}/g,
  /gho_[A-Za-z0-9]{36}/g,
  /ghs_[A-Za-z0-9]{36}/g,
  /github_pat_[A-Za-z0-9_]{22,}/g,
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
  /sk-[A-Za-z0-9]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
];
export function redactSecrets(text: string): string {
  let r = text;
  for (const p of CREDENTIAL_PATTERNS) r = r.replace(p, "[REDACTED]");
  return r;
}
function globToRegex(pattern: string): RegExp {
  const s = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{G}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{G}}/g, ".*")
    .replace(/\?/g, "[^/]");
  return new RegExp(`^${s}$`, "i");
}
export function isExcludedPath(fp: string, patterns: string[]): boolean {
  return patterns.some((p) => globToRegex(p).test(fp));
}
export const DNA_ALPHABET = /^[ACGTURYKMSWBDHVNacgturykmswbdhvn]+$/;
export const RNA_ALPHABET = /^[ACGURYKMSWBDHVNacgurykmswbdhvn]+$/;
export const PROTEIN_ALPHABET = /^[ACDEFGHIKLMNPQRSTVWY*acdefghiklmnpqrstvwy*]+$/;
