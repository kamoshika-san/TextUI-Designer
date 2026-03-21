const { expect } = require('chai');
const path = require('path');

const catalogPath = path.resolve(__dirname, '../../out/services/command-catalog.js');
const templateEntriesPath = path.resolve(__dirname, '../../out/services/template-settings-command-entries.js');

const { TEXTUI_COMMAND_IDS } = require(catalogPath);
const { TEMPLATE_SETTINGS_COMMAND_ENTRIES } = require(templateEntriesPath);

describe('template-settings-command-entries', () => {
  it('テンプレート／設定／スキーマ系コマンドが catalog に含まれる（境界の回帰）', () => {
    expect(TEMPLATE_SETTINGS_COMMAND_ENTRIES).to.have.length(8);
    const ids = TEMPLATE_SETTINGS_COMMAND_ENTRIES.map(e => e.command);
    expect(ids).to.deep.equal([
      'textui-designer.createTemplate',
      'textui-designer.insertTemplate',
      'textui-designer.openSettings',
      'textui-designer.resetSettings',
      'textui-designer.showSettings',
      'textui-designer.checkAutoPreviewSetting',
      'textui-designer.reinitializeSchemas',
      'textui-designer.debugSchemas'
    ]);
    for (const id of ids) {
      expect(TEXTUI_COMMAND_IDS).to.include(id);
    }
  });
});
