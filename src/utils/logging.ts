import * as core from "@actions/core";
export function logGroup(name: string, fn: () => void): void {
  core.startGroup(name);
  try {
    fn();
  } finally {
    core.endGroup();
  }
}
export function logInfo(msg: string): void {
  core.info(msg);
}
export function logWarning(msg: string): void {
  core.warning(msg);
}
export function logError(msg: string): void {
  core.error(msg);
}
export function logDebug(msg: string): void {
  core.debug(msg);
}
