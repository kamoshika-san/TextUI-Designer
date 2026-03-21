const { expect } = require('chai');

const { getTextUiComponentCatalog } = require('../../out/core/component-catalog.js');
const { BUILT_IN_COMPONENTS } = require('../../out/components/definitions/built-in-components.js');

describe('core component catalog', () => {
  it('returns one entry per built-in component with unique names', () => {
    const catalog = getTextUiComponentCatalog();
    expect(catalog).to.have.lengthOf(BUILT_IN_COMPONENTS.length);
    const names = catalog.map(entry => entry.name);
    expect(new Set(names).size).to.equal(names.length);
    BUILT_IN_COMPONENTS.forEach((name) => {
      expect(names.filter(n => n === name).length).to.equal(1);
    });
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
