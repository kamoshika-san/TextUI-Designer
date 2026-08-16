const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('package runtime dependencies', () => {
  const workspaceRoot = path.resolve(__dirname, '../..');
  const packageJsonPath = path.join(workspaceRoot, 'package.json');

  function readPackageJson() {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  }

  it('includes react and react-dom in the packaged runtime files for capture and MCP routes', () => {
    const pkg = readPackageJson();
    const files = new Set(pkg.files || []);

    assert.ok(files.has('node_modules/react/**/*'));
    assert.ok(files.has('node_modules/react-dom/**/*'));
    assert.ok(pkg.dependencies.react);
    assert.ok(pkg.dependencies['react-dom']);
  });

  it('overrides extract-zip to the local CVE-2026-56876 patch', () => {
    const pkg = readPackageJson();
    assert.strictEqual(pkg.dependencies['extract-zip'], 'file:vendor/extract-zip');
    assert.strictEqual(pkg.overrides['extract-zip'], '$extract-zip');

    const lock = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package-lock.json'), 'utf8'));
    const linked = lock.packages['node_modules/extract-zip'];
    const vendored = lock.packages['vendor/extract-zip'];
    assert.ok(linked && linked.link === true, 'extract-zip must link from node_modules to the vendor copy');
    assert.ok(
      typeof linked.resolved === 'string' && linked.resolved.includes('vendor/extract-zip'),
      `expected vendor resolve, got ${linked.resolved}`
    );
    assert.ok(vendored, 'vendor/extract-zip must be recorded in the lockfile');
    assert.strictEqual(vendored.version, '2.0.4');
    assert.strictEqual(pkg.dependencies.yauzl, '3.2.1');
    assert.strictEqual(pkg.overrides.yauzl, '$yauzl');
    const yauzlLocked = lock.packages['node_modules/yauzl'];
    assert.ok(yauzlLocked, 'yauzl must remain pinned in the lockfile');
    assert.strictEqual(yauzlLocked.version, '3.2.1');

    const installed = JSON.parse(
      fs.readFileSync(path.join(workspaceRoot, 'node_modules/extract-zip/package.json'), 'utf8')
    );
    assert.strictEqual(installed.version, '2.0.4');
  });
});
