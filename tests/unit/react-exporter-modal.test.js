const assert = require('assert');
const { ReactExporter } = require('../../out/exporters/react-exporter');

describe('ReactExporter Modal parity', () => {
  async function exportModal(modalProps) {
    return new ReactExporter().export({
      page: {
        id: 'modal-page',
        title: 'Modal Page',
        layout: 'vertical',
        components: [{ Modal: modalProps }],
      },
    }, { format: 'react' });
  }

  it('does not emit Modal output when open is false', async () => {
    const code = await exportModal({
      title: 'Hidden',
      open: false,
      body: 'should not render',
    });

    assert.ok(!code.includes('textui-modal'));
    assert.ok(!code.includes('Hidden'));
  });

  it('omits the footer when actions are not provided', async () => {
    const code = await exportModal({
      title: 'No actions',
      open: true,
      body: 'body only',
    });

    assert.ok(code.includes('textui-modal'));
    assert.ok(code.includes('textui-modal-header'));
    assert.ok(code.includes('textui-modal-body'));
    assert.ok(!code.includes('textui-modal-footer'));
  });

  it('defaults omitted action kind to the secondary lane', async () => {
    const code = await exportModal({
      title: 'Default kind',
      open: true,
      body: 'body',
      actions: [
        { label: 'Default action' },
      ],
    });

    assert.ok(code.includes('textui-modal-footer'));
    assert.ok(code.includes('Default action'));
    assert.ok(code.includes('bg-gray-700 hover:bg-gray-600 text-gray-300'));
  });

  it('escapes title, body, and action labels through string-literal rendering', async () => {
    const code = await exportModal({
      title: '<script>alert("x")</script>',
      open: true,
      body: 'line 1\n<div>unsafe</div>',
      actions: [
        { label: '<Delete>', kind: 'danger' },
      ],
    });

    assert.ok(code.includes('{"<script>alert(\\"x\\")</script>"}'));
    assert.ok(code.includes('{"line 1\\n<div>unsafe</div>"}'));
    assert.ok(code.includes('{"<Delete>"}'));
    assert.ok(!code.includes('<script>alert("x")</script></span>'));
  });
});
