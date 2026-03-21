const assert = require('assert');
const fs = require('fs');
const path = require('path');

/**
 * T-20260321-051: BaseComponentRenderer.dispatchExporterRenderer の switch が
 * exporter 定義・ExporterRendererMethod 型と集合一致すること（取りこぼし検知）。
 */
describe('dispatchExporterRenderer coverage (Phase 0)', () => {
  const workspaceRoot = path.resolve(__dirname, '../..');
  const rendererPath = path.join(workspaceRoot, 'src', 'exporters', 'base-component-renderer.ts');
  const typesPath = path.join(workspaceRoot, 'src', 'components', 'definitions', 'types.ts');

  const { BUILT_IN_EXPORTER_RENDERER_DEFINITIONS } = require(
    '../../out/components/definitions/exporter-renderer-definitions'
  );

  /** @returns {string[]} */
  function methodsFromDefinitions() {
    const set = new Set();
    for (const def of Object.values(BUILT_IN_EXPORTER_RENDERER_DEFINITIONS)) {
      set.add(def.rendererMethod);
    }
    return [...set].sort();
  }

  /** @returns {string[]} */
  function methodsFromDispatchSwitch() {
    const src = fs.readFileSync(rendererPath, 'utf8');
    const head = 'protected dispatchExporterRenderer(';
    const start = src.indexOf(head);
    assert.ok(start >= 0, 'dispatchExporterRenderer not found');
    const switchIdx = src.indexOf('switch (method)', start);
    assert.ok(switchIdx > start, 'switch (method) not found');
    const defaultIdx = src.indexOf('default:', switchIdx);
    assert.ok(defaultIdx > switchIdx, 'default: not found in dispatchExporterRenderer');
    const block = src.slice(switchIdx, defaultIdx);
    const keys = [...block.matchAll(/case '([^']+)':/g)].map((m) => m[1]);
    return [...new Set(keys)].sort();
  }

  /** @returns {string[]} */
  function methodsFromExporterRendererMethodType() {
    const src = fs.readFileSync(typesPath, 'utf8');
    const head = 'export type ExporterRendererMethod =';
    const start = src.indexOf(head);
    assert.ok(start >= 0, 'ExporterRendererMethod type not found');
    const after = src.slice(start + head.length);
    const endMatch = after.match(/;\s*\n/);
    assert.ok(endMatch, 'ExporterRendererMethod union terminator not found');
    const block = after.slice(0, endMatch.index);
    const keys = [...block.matchAll(/\|\s*'([^']+)'/g)].map((m) => m[1]);
    assert.ok(keys.length > 0, 'no literals parsed from ExporterRendererMethod');
    return [...new Set(keys)].sort();
  }

  it('dispatch switch の case 集合は BUILT_IN_EXPORTER_RENDERER_DEFINITIONS の rendererMethod 集合と一致（T-20260321-051）', () => {
    assert.deepStrictEqual(methodsFromDispatchSwitch(), methodsFromDefinitions());
  });

  it('dispatch switch の case 集合は ExporterRendererMethod 型リテラル集合と一致（T-20260321-051）', () => {
    assert.deepStrictEqual(methodsFromDispatchSwitch(), methodsFromExporterRendererMethodType());
  });
});
