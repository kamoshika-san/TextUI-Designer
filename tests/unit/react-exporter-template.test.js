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
          { Accordion: { items: [{ title: 'A1', components: [{ Text: { value: 'A body' } }] }] } },
          { Tabs: { defaultTab: 0, items: [{ label: 't1', components: [{ Text: { value: 'tab body' } }] }] } },
          { TreeView: { items: [{ label: 'root', children: [{ label: 'child' }] }] } },
          { Table: { columns: [{ key: 'name', header: 'Name' }], rows: [{ name: 'Alice' }], rowHover: true } }
        ]
      }
    }, { format: 'react' });

    assert.ok(code.includes('textui-tabs'));
    assert.ok(code.includes('textui-treeview'));
    assert.ok(code.includes('overflow-x-auto'));
    assert.ok(code.includes('<form key={1} id="f1"'));
    assert.ok(code.includes('inside'));
    assert.ok(code.includes('hover:bg-gray-100 transition-colors'));
  });
});
