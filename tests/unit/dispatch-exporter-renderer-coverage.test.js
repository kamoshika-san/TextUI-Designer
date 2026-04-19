const assert = require('assert');
const fs = require('fs');
const path = require('path');

/**
 * T-20260321-051 / T-069: `EXPORTER_RENDERER_DISPATCH` のキー集合が
 * exporter 定義・ExporterRendererMethod 型と一致すること（取りこぼし検知）。
 */
describe('dispatchExporterRenderer coverage (Phase 0)', () => {
  const workspaceRoot = path.resolve(__dirname, '../..');
  const rendererPath = path.join(workspaceRoot, 'src', 'exporters', 'legacy', 'base-component-renderer.ts');
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
  function methodsFromExporterRendererDispatch() {
    const src = fs.readFileSync(rendererPath, 'utf8');
    const marker = 'private static readonly EXPORTER_RENDERER_DISPATCH';
    const start = src.indexOf(marker);
    assert.ok(start >= 0, 'EXPORTER_RENDERER_DISPATCH field not found');
    const assignOpen = src.indexOf('} = {', start);
    assert.ok(assignOpen > start, 'value initializer "} = {" not found after EXPORTER_RENDERER_DISPATCH');
    const braceStart = assignOpen + 4; // `{` in `} = {`
    let depth = 0;
    let i = braceStart;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    assert.ok(depth === 0, 'failed to find closing brace for EXPORTER_RENDERER_DISPATCH value');
    const block = src.slice(braceStart, i);
    const keys = [...block.matchAll(/\n\s*(render\w+)\s*:/g)].map((m) => m[1]);
    assert.ok(keys.length > 0, 'no render* keys parsed from EXPORTER_RENDERER_DISPATCH');
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

  it('EXPORTER_RENDERER_DISPATCH のキー集合は BUILT_IN_EXPORTER_RENDERER_DEFINITIONS の rendererMethod 集合と一致（T-20260321-051）', () => {
    assert.deepStrictEqual(methodsFromExporterRendererDispatch(), methodsFromDefinitions());
  });

  it('EXPORTER_RENDERER_DISPATCH のキー集合は ExporterRendererMethod 型リテラル集合と一致（T-20260321-051）', () => {
    assert.deepStrictEqual(methodsFromExporterRendererDispatch(), methodsFromExporterRendererMethodType());
  });
});
