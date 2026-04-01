/**
 * loadDiffWorkflowConfig / resolveDiffWorkflowConfig (T-20260401-007, Epic L Sprint L3)
 *
 * Reads diff workflow configuration from a JSON file and resolves the final
 * effective config following resolution priority:
 *   CLI overrides > ENV variables > file config > hardcoded defaults
 *
 * ENV variable mapping:
 *   TEXTUI_DIFF_MODE                    → diffWorkflow.mode
 *   TEXTUI_DIFF_AXIS                    → diffWorkflow.enablementAxis
 *   TEXTUI_DIFF_FEATURE_PR_COMMENT      → diffWorkflow.features.prComment
 *   TEXTUI_DIFF_FEATURE_CHECK_RUN_GATE  → diffWorkflow.features.checkRunGate
 */

import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DiffWorkflowEnablementAxis = 'local-only' | 'ci-only' | 'pr-enabled';
export type DiffWorkflowMode = 'advisory' | 'strict';

export interface DiffWorkflowFeatures {
  prComment: boolean;
  checkRunGate: boolean;
}

/** Shape of the on-disk config file. All fields are optional. */
export interface DiffWorkflowFileConfig {
  diffWorkflow?: {
    enablementAxis?: DiffWorkflowEnablementAxis;
    mode?: DiffWorkflowMode;
    features?: Partial<DiffWorkflowFeatures>;
  };
}

/** Fully resolved, fully populated config with all defaults applied. */
export interface DiffWorkflowConfig {
  enablementAxis: DiffWorkflowEnablementAxis;
  mode: DiffWorkflowMode;
  features: DiffWorkflowFeatures;
}

/**
 * CLI / programmatic overrides passed to resolveDiffWorkflowConfig().
 * All fields are optional — absent fields fall through to ENV / file / defaults.
 */
export interface DiffWorkflowOverrides {
  enablementAxis?: DiffWorkflowEnablementAxis;
  mode?: DiffWorkflowMode;
  features?: Partial<DiffWorkflowFeatures>;
  /** Path to the JSON config file. Defaults to 'config/diff-workflow.json'. */
  configFilePath?: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: DiffWorkflowConfig = {
  enablementAxis: 'local-only',
  mode: 'advisory',
  features: {
    prComment: false,
    checkRunGate: false,
  },
};

// ---------------------------------------------------------------------------
// File loader
// ---------------------------------------------------------------------------

/**
 * Read the diff workflow JSON config file.
 * Returns an empty object (equivalent to "file absent") when the file does not
 * exist or cannot be parsed.
 *
 * @param filePath  Path to the JSON config file.
 */
export function loadDiffWorkflowConfig(filePath?: string): DiffWorkflowFileConfig {
  const resolvedPath = filePath ?? 'config/diff-workflow.json';
  try {
    const raw = fs.readFileSync(resolvedPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    // Basic structural validation — only accept plain objects.
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as DiffWorkflowFileConfig;
    }
    return {};
  } catch {
    // File absent, unreadable, or invalid JSON — return empty config.
    return {};
  }
}

// ---------------------------------------------------------------------------
// ENV helpers
// ---------------------------------------------------------------------------

function readEnvMode(): DiffWorkflowMode | undefined {
  const raw = process.env['TEXTUI_DIFF_MODE'];
  if (raw === 'strict' || raw === 'advisory') {
    return raw;
  }
  return undefined;
}

function readEnvAxis(): DiffWorkflowEnablementAxis | undefined {
  const raw = process.env['TEXTUI_DIFF_AXIS'];
  if (raw === 'local-only' || raw === 'ci-only' || raw === 'pr-enabled') {
    return raw;
  }
  return undefined;
}

function readEnvBool(envVar: string): boolean | undefined {
  const raw = process.env[envVar];
  if (raw === undefined) { return undefined; }
  const lower = raw.toLowerCase();
  if (lower === 'true' || lower === '1') { return true; }
  if (lower === 'false' || lower === '0') { return false; }
  return undefined;
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

/**
 * Resolve the final DiffWorkflowConfig by merging sources in priority order:
 *   CLI overrides > ENV variables > file config > defaults
 *
 * @param overrides  CLI / programmatic overrides. Pass `{}` for no overrides.
 */
export function resolveDiffWorkflowConfig(overrides: DiffWorkflowOverrides): DiffWorkflowConfig {
  // Layer 1: file config
  const fileConfig = loadDiffWorkflowConfig(overrides.configFilePath);
  const fileDiff = fileConfig.diffWorkflow ?? {};

  // Layer 2: ENV
  const envMode = readEnvMode();
  const envAxis = readEnvAxis();
  const envPrComment = readEnvBool('TEXTUI_DIFF_FEATURE_PR_COMMENT');
  const envCheckRunGate = readEnvBool('TEXTUI_DIFF_FEATURE_CHECK_RUN_GATE');

  // Resolution: priority is CLI > ENV > file > default.
  const enablementAxis: DiffWorkflowEnablementAxis =
    overrides.enablementAxis ??
    envAxis ??
    fileDiff.enablementAxis ??
    DEFAULT_CONFIG.enablementAxis;

  const mode: DiffWorkflowMode =
    overrides.mode ??
    envMode ??
    fileDiff.mode ??
    DEFAULT_CONFIG.mode;

  const prComment: boolean =
    overrides.features?.prComment ??
    envPrComment ??
    fileDiff.features?.prComment ??
    DEFAULT_CONFIG.features.prComment;

  const checkRunGate: boolean =
    overrides.features?.checkRunGate ??
    envCheckRunGate ??
    fileDiff.features?.checkRunGate ??
    DEFAULT_CONFIG.features.checkRunGate;

  return {
    enablementAxis,
    mode,
    features: {
      prComment,
      checkRunGate,
    },
  };
}
