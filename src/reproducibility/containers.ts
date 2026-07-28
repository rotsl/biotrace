import { safeFileExists, safeReadFile } from "../utils/files";
export interface ContainerResult {
  hasDockerfile: boolean;
  usesUnboundedTag: boolean;
}
export function checkContainers(ws: string): ContainerResult {
  let hasDF = false,
    unbounded = false;
  if (safeFileExists("Dockerfile", ws)) {
    hasDF = true;
    const c = safeReadFile("Dockerfile", ws);
    if (c)
      for (const l of c.split("\n")) {
        const t = l.trim();
        if (t.startsWith("FROM")) {
          const tag = t.split(":").pop()?.trim()?.split(" ")[0];
          if (tag === "latest" || (!t.includes(":") && !t.startsWith("FROM scratch")))
            unbounded = true;
        }
      }
  }
  return { hasDockerfile: hasDF, usesUnboundedTag: unbounded };
}
