import * as fs from 'fs';
import * as path from 'path';
import type { CliState } from './types';
import { atomicWriteJson } from './io';
import { extractComponentRecords } from './planner';
import { sha256, stableStringify } from './utils';

export const DEFAULT_STATE_PATH = path.resolve('.textui/state.json');
export const CLI_VERSION = '0.1.0';

export function loadState(statePath: string = DEFAULT_STATE_PATH): CliState | null {
  if (!fs.existsSync(statePath)) {
    return null;
  }
  const raw = fs.readFileSync(statePath, 'utf8');
  return JSON.parse(raw) as CliState;
}

export function saveState(statePath: string, state: CliState): void {
  atomicWriteJson(statePath, state);
}

export function buildState(params: {
  entry: string;
  provider: string;
  providerVersion: string;
  dsl: unknown;
  dslRaw: string;
  artifacts: Array<{ file: string; content: string }>;
}): CliState {
  const now = new Date().toISOString();
  const resources = extractComponentRecords(params.dsl);

  return {
    version: 1,
    dsl: {
      entry: params.entry,
      hash: sha256(params.dslRaw),
      updatedAt: now
    },
    provider: {
      name: params.provider,
      version: params.providerVersion
    },
    resources,
    artifacts: params.artifacts.map(item => ({
      file: item.file,
      hash: sha256(item.content),
      size: Buffer.byteLength(item.content, 'utf8')
    })),
    meta: {
      cliVersion: CLI_VERSION,
      lastApply: now
    }
  };
}

export function stateToStableJson(state: CliState): string {
  return stableStringify(state);
}
