/**
 * Unit tests for writeDiffArtifact() (T-20260401-003).
 *
 * Coverage:
 *   - Normal write: both artifact and sidecar files are created
 *   - Sidecar sha256 matches sha256 of artifact content
 *   - Sidecar contains all required fields (artifactVersion / sha256 / eventCount / resultState / createdAt)
 *   - Filenames follow <runId>.diff.json / <runId>.meta.json convention
 *   - Files are placed in .textui/diff-artifacts/ under outputDir
 *   - No .tmp file remains after successful write
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { writeDiffArtifact } = require('../../out/workflow/diff/artifact/write-diff-artifact');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'write-diff-artifact-test-'));
}

function makePayload(eventCount = 0) {
  const events = [];
  for (let i = 0; i < eventCount; i++) {
    events.push({
      eventId: `ev-${i}`,
      kind: 'add',
      entityKind: 'component',
      pairingReason: 'deterministic-explicit-id',
      fallbackMarker: 'none'
    });
  }
  return {
    kind: 'textui-diff-result-external',
    schemaVersion: 'diff-result-external/v0',
    producer: {
      engine: 'textui-diff-core',
      engineVersion: '0.7.3',
      compareStage: 'c1-skeleton',
      producedAt: '2026-04-01T00:00:00.000Z'
    },
    events,
    metadata: {
      eventCount,
      previousSource: { pageId: 'p1' },
      nextSource: { pageId: 'p2' }
    }
  };
}

function sha256OfString(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('writeDiffArtifact (T-20260401-003)', () => {

  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    // Clean up temp dir
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  describe('File creation', () => {
    it('creates the artifact file <runId>.diff.json', async () => {
      const payload = makePayload(0);
      const result = await writeDiffArtifact('run-001', payload, { outputDir: tmpDir });
      assert.ok(fs.existsSync(result.artifactPath), 'artifact file should exist');
    });

    it('creates the sidecar file <runId>.meta.json', async () => {
      const payload = makePayload(0);
      const result = await writeDiffArtifact('run-001', payload, { outputDir: tmpDir });
      assert.ok(fs.existsSync(result.sidecarPath), 'sidecar file should exist');
    });

    it('places files under .textui/diff-artifacts/', async () => {
      const payload = makePayload(0);
      const result = await writeDiffArtifact('run-002', payload, { outputDir: tmpDir });
      const expectedDir = path.join(tmpDir, '.textui', 'diff-artifacts');
      assert.ok(result.artifactPath.startsWith(expectedDir), 'artifact should be in .textui/diff-artifacts/');
      assert.ok(result.sidecarPath.startsWith(expectedDir), 'sidecar should be in .textui/diff-artifacts/');
    });

    it('uses runId as filename prefix', async () => {
      const payload = makePayload(0);
      const result = await writeDiffArtifact('my-run-abc', payload, { outputDir: tmpDir });
      assert.ok(path.basename(result.artifactPath) === 'my-run-abc.diff.json');
      assert.ok(path.basename(result.sidecarPath) === 'my-run-abc.meta.json');
    });

    it('creates output directory if it does not exist', async () => {
      const nestedDir = path.join(tmpDir, 'deep', 'nested');
      const payload = makePayload(0);
      const result = await writeDiffArtifact('run-003', payload, { outputDir: nestedDir });
      assert.ok(fs.existsSync(result.artifactPath));
      assert.ok(fs.existsSync(result.sidecarPath));
    });
  });

  describe('Artifact content', () => {
    it('artifact file is valid JSON matching the payload', async () => {
      const payload = makePayload(2);
      const result = await writeDiffArtifact('run-004', payload, { outputDir: tmpDir });
      const content = fs.readFileSync(result.artifactPath, 'utf8');
      const parsed = JSON.parse(content);
      assert.strictEqual(parsed.kind, 'textui-diff-result-external');
      assert.strictEqual(parsed.events.length, 2);
    });

    it('artifact eventCount matches payload events.length', async () => {
      const payload = makePayload(3);
      const result = await writeDiffArtifact('run-005', payload, { outputDir: tmpDir });
      const content = JSON.parse(fs.readFileSync(result.artifactPath, 'utf8'));
      assert.strictEqual(content.metadata.eventCount, 3);
    });
  });

  describe('Sidecar content and sha256', () => {
    it('sidecar sha256 matches sha256 of artifact JSON content', async () => {
      const payload = makePayload(1);
      const result = await writeDiffArtifact('run-006', payload, { outputDir: tmpDir });

      const artifactContent = fs.readFileSync(result.artifactPath, 'utf8');
      const expectedSha256 = sha256OfString(artifactContent);

      const sidecar = JSON.parse(fs.readFileSync(result.sidecarPath, 'utf8'));
      assert.strictEqual(sidecar.sha256, expectedSha256);
    });

    it('returned sha256 matches sidecar sha256', async () => {
      const payload = makePayload(0);
      const result = await writeDiffArtifact('run-007', payload, { outputDir: tmpDir });
      const sidecar = JSON.parse(fs.readFileSync(result.sidecarPath, 'utf8'));
      assert.strictEqual(result.sha256, sidecar.sha256);
    });

    it('sidecar has all required fields', async () => {
      const payload = makePayload(2);
      const result = await writeDiffArtifact('run-008', payload, { outputDir: tmpDir });
      const sidecar = JSON.parse(fs.readFileSync(result.sidecarPath, 'utf8'));

      assert.ok('artifactVersion' in sidecar, 'artifactVersion required');
      assert.ok('sha256' in sidecar, 'sha256 required');
      assert.ok('eventCount' in sidecar, 'eventCount required');
      assert.ok('resultState' in sidecar, 'resultState required');
      assert.ok('createdAt' in sidecar, 'createdAt required');
    });

    it('sidecar eventCount matches payload events length', async () => {
      const payload = makePayload(5);
      const result = await writeDiffArtifact('run-009', payload, { outputDir: tmpDir });
      const sidecar = JSON.parse(fs.readFileSync(result.sidecarPath, 'utf8'));
      assert.strictEqual(sidecar.eventCount, 5);
    });

    it('sidecar artifactVersion is diff-artifact/v0', async () => {
      const payload = makePayload(0);
      const result = await writeDiffArtifact('run-010', payload, { outputDir: tmpDir });
      const sidecar = JSON.parse(fs.readFileSync(result.sidecarPath, 'utf8'));
      assert.strictEqual(sidecar.artifactVersion, 'diff-artifact/v0');
    });

    it('sidecar createdAt is a parseable ISO timestamp', async () => {
      const payload = makePayload(0);
      const result = await writeDiffArtifact('run-011', payload, { outputDir: tmpDir });
      const sidecar = JSON.parse(fs.readFileSync(result.sidecarPath, 'utf8'));
      const ts = new Date(sidecar.createdAt);
      assert.ok(!isNaN(ts.getTime()), 'createdAt must be a valid date');
    });
  });

  describe('No .tmp residue after successful write', () => {
    it('no .tmp files remain after successful artifact write', async () => {
      const payload = makePayload(0);
      const result = await writeDiffArtifact('run-012', payload, { outputDir: tmpDir });
      const artifactTmp = `${result.artifactPath}.tmp`;
      const sidecarTmp = `${result.sidecarPath}.tmp`;
      assert.ok(!fs.existsSync(artifactTmp), '.diff.json.tmp must not remain');
      assert.ok(!fs.existsSync(sidecarTmp), '.meta.json.tmp must not remain');
    });
  });

  describe('Result object', () => {
    it('returns artifactPath, sidecarPath, sha256, createdAt', async () => {
      const payload = makePayload(0);
      const result = await writeDiffArtifact('run-013', payload, { outputDir: tmpDir });
      assert.ok(typeof result.artifactPath === 'string' && result.artifactPath.length > 0);
      assert.ok(typeof result.sidecarPath === 'string' && result.sidecarPath.length > 0);
      assert.ok(typeof result.sha256 === 'string' && result.sha256.length === 64, 'sha256 must be 64 hex chars');
      assert.ok(typeof result.createdAt === 'string' && result.createdAt.length > 0);
    });
  });
});
