#!/usr/bin/env node
/**
 * T-002: Regenerate WebView assets and fail if committed `media/` differs from build output.
 * Intended for CI and optional local runs (`npm run check:webview-media-drift`).
 */
const { spawnSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function run(cmd, args, inherit = false) {
  const r = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: inherit ? 'inherit' : 'pipe',
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const code = r.status === null ? 1 : r.status;
  return { code, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function main() {
  const build = run('npm', ['run', 'build-webview'], true);
  if (build.code !== 0) {
    console.error('[T-002] build-webview failed');
    process.exit(1);
  }

  const untracked = run('git', ['ls-files', '-o', '--exclude-standard', '--', 'media']);
  if (untracked.code !== 0) {
    console.error('[T-002] git ls-files failed:', untracked.stderr);
    process.exit(1);
  }
  if (untracked.stdout.trim()) {
    console.error('[T-002] untracked files under media/ after build-webview:');
    console.error(untracked.stdout.trimEnd());
    process.exit(1);
  }

  const diff = run('git', ['diff', '--exit-code', '--', 'media']);
  if (diff.code !== 0) {
    console.error('[T-002] index/working tree under media/ differs after build-webview (vs last `git add`).');
    console.error('Fix: run `npm run build-webview`, then `git add -- media/` and commit.');
    process.exit(1);
  }

  console.log('[T-002] media/ matches build-webview output (OK)');
}

main();
