const { expect } = require('chai');

const { getTextUiComponentCatalog } = require('../../out/core/component-catalog.js');

describe('core component catalog', () => {
  it('includes Link definition for MCP catalog consumers', () => {
    const catalog = getTextUiComponentCatalog();
    const link = catalog.find(entry => entry.name === 'Link');

    expect(link).to.exist;
    expect(link.requiredProps).to.include.members(['href', 'label']);
    expect(link.optionalProps).to.include.members(['target', 'token']);
    expect(link.supportsChildren).to.equal(false);
  });
});
