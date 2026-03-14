const assert = require('assert');
const { ReactExporter } = require('../../out/exporters/react-exporter');

describe('Progress segments rendering', () => {
  it('react exporter renders segmented progress bars and summed value', async () => {
    const exporter = new ReactExporter();
    const code = await exporter.export({
      page: {
        id: 'segments',
        title: 'Segments',
        layout: 'vertical',
        components: [
          {
            Progress: {
              label: 'Languages',
              segments: [
                { label: 'TypeScript', value: 54.5, variant: 'primary' },
                { label: 'JavaScript', value: 43.6, variant: 'warning' },
                { label: 'CSS', value: 1.8, variant: 'error' }
              ],
              showValue: true
            }
          }
        ]
      }
    }, { format: 'react' });

    assert.ok(code.includes('textui-progress-primary'));
    assert.ok(code.includes('textui-progress-warning'));
    assert.ok(code.includes('textui-progress-error'));
    assert.ok(code.includes('54.5%'));
    assert.ok(code.includes('43.6%'));
    assert.ok(code.includes('1.8%'));
    assert.ok(code.includes('99.9%'));
  });
});
