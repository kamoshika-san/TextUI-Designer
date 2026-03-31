/**
 * writeDiffArtifact: atomic write of DiffResultExternal artifact + sidecar.
 *
 * Purpose (T-20260401-003, Epic L Sprint L1):
 *   Persist a validated DiffResultExternal to the `.textui/diff-artifacts/`
 *   directory using atomic write semantics (*.tmp → fsync → rename) to prevent
 *   partial or corrupt artifacts from becoming visible to readers.
 *
 *   Each run produces two files:
 *     <runId>.diff.json   — full DiffResultExternal payload
 *     <runId>.meta.json   — lightweight sidecar (sha256 / eventCount / resultState / etc.)
 *
 * Atomic write protocol:
 *   1. Write content to `<target>.tmp`
 *   2. fsync the file descriptor (flush OS write buffer to disk)
 *   3. Close the file descriptor
 *   4. rename `<target>.tmp` → `<target>`  (atomic on POSIX; best-effort on Windows)
 *   If any step fails, the .tmp file is removed and the error is propagated.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { DiffResultExternal } from '../../../core/textui-diff-result-external';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WriteDiffArtifactOpts {
  /** Directory under which `.textui/diff-artifacts/` will be created (default: cwd). */
  outputDir?: string;
}

export interface ArtifactWriteResult {
  /** Absolute path of the main artifact file (<runId>.diff.json). */
  artifactPath: string;
  /** Absolute path of the sidecar file (<runId>.meta.json). */
  sidecarPath: string;
  /** SHA-256 hex digest of the main JSON content. */
  sha256: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

export interface ArtifactSidecar {
  artifactVersion: string;
  sha256: string;
  eventCount: number;
  resultState: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ARTIFACT_SUBDIR = path.join('.textui', 'diff-artifacts');
const ARTIFACT_VERSION = 'diff-artifact/v0';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Write `content` to `destPath` atomically:
 *   write to `<destPath>.tmp` → fsync → close → rename → destPath.
 * Removes the .tmp file on failure.
 */
async function writeAtomic(destPath: string, content: string): Promise<void> {
  const tmpPath = `${destPath}.tmp`;

  let fd: number | undefined;
  try {
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    // Open for write (create or truncate)
    fd = fs.openSync(tmpPath, 'w');
    fs.writeSync(fd, content, 0, 'utf8');
    // fsync: flush to disk
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;

    // Atomic rename: on POSIX this is guaranteed atomic; on Windows it is
    // best-effort (rename will overwrite the destination if it already exists).
    fs.renameSync(tmpPath, destPath);
  } catch (err) {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { /* ignore */ }
    }
    // Remove partial .tmp on failure
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Write a validated DiffResultExternal to the artifact directory.
 *
 * @param runId    Stable identifier for this diff run (e.g. git SHA or UUID).
 *                 Used as the filename prefix.
 * @param payload  Validated DiffResultExternal (must have passed validateDiffResultExternal).
 * @param opts     Options including output directory override.
 * @returns        ArtifactWriteResult with paths, sha256, and timestamps.
 */
export async function writeDiffArtifact(
  runId: string,
  payload: DiffResultExternal,
  opts: WriteDiffArtifactOpts = {}
): Promise<ArtifactWriteResult> {
  const rootDir = opts.outputDir ?? process.cwd();
  const artifactsDir = path.join(rootDir, ARTIFACT_SUBDIR);

  const artifactPath = path.join(artifactsDir, `${runId}.diff.json`);
  const sidecarPath = path.join(artifactsDir, `${runId}.meta.json`);

  // Serialize the main artifact
  const artifactJson = JSON.stringify(payload, null, 2);

  // Compute sha256 from the JSON string
  const sha256 = crypto.createHash('sha256').update(artifactJson, 'utf8').digest('hex');

  const createdAt = new Date().toISOString();

  // Build sidecar
  const sidecar: ArtifactSidecar = {
    artifactVersion: ARTIFACT_VERSION,
    sha256,
    eventCount: payload.events.length,
    resultState: payload.metadata ? 'ok' : 'unknown',
    createdAt
  };
  const sidecarJson = JSON.stringify(sidecar, null, 2);

  // Write both files atomically (sidecar written after main — if main fails, no sidecar)
  await writeAtomic(artifactPath, artifactJson);
  await writeAtomic(sidecarPath, sidecarJson);

  return {
    artifactPath,
    sidecarPath,
    sha256,
    createdAt
  };
}
