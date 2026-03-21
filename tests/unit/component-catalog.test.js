const { expect } = require('chai');

const { getTextUiComponentCatalog } = require('../../out/core/component-catalog.js');
const { COMPONENT_DEFINITIONS } = require('../../out/components/definitions/component-definitions.js');

/**
 * MCP / core `getTextUiComponentCatalog` の不変条件（T-20260321-015）。
 * descriptor（COMPONENT_DEFINITIONS）と同じ順・同じ件数で、名前の重複があれば CI で落ちる。
 */
describe('core component catalog', () => {
  it('matches COMPONENT_DEFINITIONS order and rejects duplicate names (T-20260321-015)', () => {
    const catalog = getTextUiComponentCatalog();
    const names = catalog.map((entry) => entry.name);
    const expectedNames = COMPONENT_DEFINITIONS.map((d) => d.name);
    expect(names).to.deep.equal(expectedNames);
    expect(new Set(names).size, 'duplicate component name in catalog').to.equal(names.length);
  });

  it('includes Link definition for MCP catalog consumers', () => {
    const catalog = getTextUiComponentCatalog();
    const link = catalog.find(entry => entry.name === 'Link');

    expect(link).to.exist;
    expect(link.requiredProps).to.include.members(['href', 'label']);
    expect(link.optionalProps).to.include.members(['target', 'token']);
    expect(link.supportsChildren).to.equal(false);
  });

  it('includes Breadcrumb definition for hierarchical navigation', () => {
    const catalog = getTextUiComponentCatalog();
    const breadcrumb = catalog.find(entry => entry.name === 'Breadcrumb');

    expect(breadcrumb).to.exist;
    expect(breadcrumb.requiredProps).to.include.members(['items', 'items[].label']);
    expect(breadcrumb.optionalProps).to.include.members(['separator', 'items[].href', 'items[].target', 'token']);
    expect(breadcrumb.supportsChildren).to.equal(false);
  });

});
