import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import * as core from "@actions/core";
import { BioTraceConfigSchema } from "./schema";
import { DEFAULT_CONFIG } from "./defaults";
import type { BioTraceConfig } from "./types";

export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly configPath?: string,
  ) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function loadConfig(configPath: string, workspace: string): BioTraceConfig {
  const fullPath = path.resolve(workspace, configPath);
  if (!fullPath.startsWith(path.resolve(workspace)))
    throw new ConfigurationError(`Path escapes workspace: ${configPath}`, configPath);
  if (!fs.existsSync(fullPath)) {
    core.info(`No config at ${configPath}. Using defaults.`);
    return { ...DEFAULT_CONFIG };
  }
  const raw = fs.readFileSync(fullPath, "utf-8");
  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new ConfigurationError(
      `YAML parse error: ${err instanceof Error ? err.message : String(err)}`,
      configPath,
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    throw new ConfigurationError("Config must be a YAML mapping", configPath);
  const rec = parsed as Record<string, unknown>;
  if (rec.version === undefined)
    throw new ConfigurationError('Missing "version"', configPath);
  if (rec.version !== 1)
    throw new ConfigurationError(
      `Unsupported version: ${String(rec.version)}. Only version 1.`,
      configPath,
    );
  const result = BioTraceConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.length > 0 ? i.path.join(".") : "(root)"}: ${i.message}`)
      .join("\n");
    throw new ConfigurationError(`Validation failed:\n${issues}`, configPath);
  }
  return mergeWithDefaults(result.data as Record<string, unknown>);
}

function mergeWithDefaults(parsed: Record<string, unknown>): BioTraceConfig {
  const config: BioTraceConfig = { ...DEFAULT_CONFIG, ...parsed };
  if (parsed.files)
    config.files = {
      ...DEFAULT_CONFIG.files,
      ...(parsed.files as Record<string, unknown>),
    };
  if (parsed.reproducibility) {
    config.reproducibility = {
      ...DEFAULT_CONFIG.reproducibility!,
      ...(parsed.reproducibility as Record<string, unknown>),
    };
    const pw = (parsed.reproducibility as Record<string, unknown>).weights as
      Record<string, number> | undefined;
    if (pw)
      config.reproducibility!.weights = {
        ...DEFAULT_CONFIG.reproducibility!.weights,
        ...pw,
      };
  }
  if (parsed.labels) {
    config.labels = {
      ...DEFAULT_CONFIG.labels!,
      ...(parsed.labels as Record<string, unknown>),
    };
    const lc = (parsed.labels as Record<string, unknown>).colours as
      Record<string, string> | undefined;
    if (lc) config.labels!.colours = { ...DEFAULT_CONFIG.labels!.colours, ...lc };
  }
  if (parsed.comment)
    config.comment = {
      ...DEFAULT_CONFIG.comment!,
      ...(parsed.comment as Record<string, unknown>),
    };
  if (parsed.ai) {
    config.ai = { ...DEFAULT_CONFIG.ai!, ...(parsed.ai as Record<string, unknown>) };
    const ns = (parsed.ai as Record<string, unknown>).never_send as string[] | undefined;
    if (ns) config.ai!.never_send = [...(DEFAULT_CONFIG.ai!.never_send ?? []), ...ns];
  }
  return config;
}
