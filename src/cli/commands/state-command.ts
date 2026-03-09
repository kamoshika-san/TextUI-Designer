import * as path from 'path';
import { DEFAULT_STATE_PATH, loadState, saveState, stateToStableJson } from '../state-manager';
import type { CliState, ExitCode } from '../types';
import { getArg, hasFlag, loadStatePayload, printJson } from '../command-support';

export function handleStateCommand(): ExitCode {
  const sub = process.argv[3] ?? 'show';
  const statePath = path.resolve(getArg('--state') ?? DEFAULT_STATE_PATH);
  const state = loadState(statePath);

  if (sub === 'show' || sub === 'pull') {
    if (!state) {
      process.stderr.write(`state not found: ${statePath}\n`);
      return 1;
    }
    if (hasFlag('--json')) {
      printJson(state);
    } else {
      process.stdout.write(`${stateToStableJson(state)}\n`);
    }
    return 0;
  }

  if (sub === 'push') {
    const payload = loadStatePayload(getArg('--input')) as CliState;
    saveState(statePath, payload);
    if (hasFlag('--json')) {
      printJson({ pushed: true, state: statePath, resources: payload.resources?.length ?? 0 });
    } else {
      process.stdout.write(`state pushed: ${statePath}\n`);
    }
    return 0;
  }

  if (sub === 'rm') {
    if (!state) {
      process.stderr.write(`state not found: ${statePath}\n`);
      return 1;
    }
    const id = getArg('--id');
    if (!id) {
      process.stderr.write('state rm requires --id <resource-id>\n');
      return 1;
    }
    const before = state.resources.length;
    state.resources = state.resources.filter(resource => resource.id !== id);
    saveState(statePath, state);
    const removed = before - state.resources.length;
    if (hasFlag('--json')) {
      printJson({ removed, id, state: statePath });
    } else {
      process.stdout.write(`removed ${removed} resource(s): ${id}\n`);
    }
    return 0;
  }

  process.stderr.write(`unsupported state command: ${sub}\n`);
  return 1;
}
