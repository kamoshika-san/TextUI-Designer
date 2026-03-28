const assert = require('assert');
const { ReactExporter } = require('../../out/exporters/react-exporter');

describe('ReactExporter template rendering split', () => {
  it('Accordion/Tabs/TreeView/Table/Container/Form を含むDSLをエクスポートできる', async () => {
    const exporter = new ReactExporter();
    const code = await exporter.export({
      page: {
        id: 'complex',
        title: 'Complex',
        layout: 'vertical',
        components: [
          { Container: { layout: 'horizontal', components: [{ Text: { value: 'inside' } }] } },
          { Form: { id: 'f1', fields: [{ Input: { label: 'name', name: 'name' } }], actions: [{ Button: { label: 'save' } }] } },
          { Input: { label: 'Email', type: 'email', disabled: true } },
          { Checkbox: { label: 'Agree', checked: true, disabled: true } },
          { Radio: { label: 'Primary choice', name: 'choice', value: 'a', checked: true, disabled: true } },
          { DatePicker: { label: 'Due', name: 'dueDate', disabled: true } },
          { Alert: { title: 'Heads up', message: 'needs attention', variant: 'warning' } },
          { Accordion: { items: [{ title: 'A1', components: [{ Text: { value: 'A body' } }] }] } },
          { Tabs: { defaultTab: 0, items: [{ label: 't1', components: [{ Text: { value: 'tab body' } }] }] } },
          { TreeView: { items: [{ label: 'root', children: [{ label: 'child' }] }] } },
          { Table: { columns: [{ key: 'name', header: 'Name' }, { key: 'actions', header: 'Actions' }], rows: [{ name: 'Alice', actions: { Button: { label: 'Edit' } } }], rowHover: true } }
        ]
      }
    }, { format: 'react' });

    assert.ok(code.includes('textui-accordion'));
    assert.ok(code.includes('textui-accordion-trigger'));
    assert.ok(code.includes('textui-accordion-panel'));
    assert.ok(code.includes('textui-accordion-body'));
    assert.ok(code.includes('textui-tabs'));
    assert.ok(code.includes('textui-treeview'));
    assert.ok(code.includes('textui-treeview-actions'));
    assert.ok(code.includes('textui-treeview-action-link'));
    assert.ok(code.includes('textui-treeview-children'));
    assert.ok(code.includes('textui-tabs-list'));
    assert.ok(code.includes('textui-tab-panel-body'));
    assert.ok(code.includes('textui-table-container'));
    assert.ok(code.includes('textui-table-header'));
    assert.ok(code.includes('textui-table-row'));
    assert.ok(code.includes('textui-input'));
    assert.ok(code.includes('textui-checkbox'));
    assert.ok(code.includes('textui-radio-option'));
    assert.ok(code.includes('textui-datepicker'));
    assert.ok(code.includes('textui-alert warning'));
    assert.ok(code.includes('textui-alert-title'));
    assert.ok(code.includes('textui-alert-message'));
    assert.ok(code.includes('textui-text'));
    assert.ok(code.includes('is-open'));
    assert.ok(code.includes('<form key={1} id="f1"'));
    assert.ok(code.includes('inside'));
    assert.ok(code.includes('hover:bg-gray-100 transition-colors has-hover'));
    assert.ok(code.includes('textui-tab-active is-active'));
    assert.ok(code.includes('opacity-50 cursor-not-allowed'));
    assert.match(code, /(?:>|\s)Edit(?:<|\s)/);
  });
});
