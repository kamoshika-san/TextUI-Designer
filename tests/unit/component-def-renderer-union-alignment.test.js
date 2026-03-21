const assert = require('assert');
const fs = require('fs');
const path = require('path');

/**
 * T-20260321-050: COMPONENT_DEFINITIONS の name 集合と
 * `src/renderer/types.ts` の `ComponentDef` union のキー集合が乖離しないこと。
 */
describe('ComponentDef union vs COMPONENT_DEFINITIONS (Phase 0)', () => {
  const workspaceRoot = path.resolve(__dirname, '../..');
  const typesPath = path.join(workspaceRoot, 'src', 'renderer', 'types.ts');

  const { COMPONENT_DEFINITIONS } = require('../../out/components/definitions/component-definitions');

  /** @returns {string[]} */
  function extractComponentDefUnionKeys() {
    const src = fs.readFileSync(typesPath, 'utf8');
    const head = 'export type ComponentDef =';
    const start = src.indexOf(head);
    assert.ok(start >= 0, 'export type ComponentDef not found in renderer/types.ts');
    const tail = src.indexOf('export interface PageDef', start + head.length);
    assert.ok(tail > start, 'PageDef block not found after ComponentDef');
    const block = src.slice(start + head.length, tail);
    const keys = [...block.matchAll(/\|\s*\{\s*(\w+)\s*:/g)].map((m) => m[1]);
    assert.ok(keys.length > 0, 'no union keys parsed from ComponentDef');
    return keys;
  }

  it('ComponentDef union のキー集合は COMPONENT_DEFINITIONS の name 列と一致する（T-20260321-050）', () => {
    const fromUnion = [...new Set(extractComponentDefUnionKeys())].sort();
    const fromDefinitions = [...new Set(COMPONENT_DEFINITIONS.map((d) => d.name))].sort();
    assert.deepStrictEqual(fromUnion, fromDefinitions);
  });
});
