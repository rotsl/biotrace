import { safeFileExists, safeReadFile } from "../utils/files";
const R_FILES = ["DESCRIPTION", "renv.lock", "pak.lock", "Dockerfile", ".Rprofile"];
export interface REnvResult {
  hasEnvironment: boolean;
  hasLockFile: boolean;
  hasConstraints: boolean;
}
export function detectREnv(ws: string): REnvResult {
  const envs = R_FILES.filter(
    (f) => safeFileExists(f, ws) && f !== "renv.lock" && f !== "pak.lock",
  );
  const locks = R_FILES.filter(
    (f) => safeFileExists(f, ws) && (f === "renv.lock" || f === "pak.lock"),
  );
  let hasC = locks.length > 0;
  if (safeFileExists("DESCRIPTION", ws)) {
    const c = safeReadFile("DESCRIPTION", ws);
    if (c && /\(\s*[><=]+\s*/.test(c)) hasC = true;
  }
  return {
    hasEnvironment: envs.length > 0 || locks.length > 0,
    hasLockFile: locks.length > 0,
    hasConstraints: hasC,
  };
}
