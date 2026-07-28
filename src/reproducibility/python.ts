import { safeFileExists, safeReadFile } from "../utils/files";
const PY_ENV = [
  "requirements.txt",
  "requirements-dev.txt",
  "pyproject.toml",
  "environment.yml",
  "environment.yaml",
  "Pipfile",
  "Dockerfile",
];
const PY_LOCK = ["poetry.lock", "uv.lock", "conda-lock.yml", "Pipfile.lock"];
export interface PythonEnvResult {
  hasEnvironment: boolean;
  hasLockFile: boolean;
  hasConstraints: boolean;
}
export function detectPythonEnv(ws: string): PythonEnvResult {
  const eFiles = PY_ENV.filter((f) => safeFileExists(f, ws));
  const lFiles = PY_LOCK.filter((f) => safeFileExists(f, ws));
  let hasC = lFiles.length > 0;
  for (const f of eFiles) {
    if (f === "requirements.txt" || f === "requirements-dev.txt") {
      const c = safeReadFile(f, ws);
      if (c && /[><=!]/.test(c)) hasC = true;
    }
  }
  return {
    hasEnvironment: eFiles.length > 0 || lFiles.length > 0,
    hasLockFile: lFiles.length > 0,
    hasConstraints: hasC,
  };
}
