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
});
