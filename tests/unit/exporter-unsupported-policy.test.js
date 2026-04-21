const assert = require('assert');

const {
  EXPORTER_CAPABILITY_SUPPORT_STATES,
  createUnsupportedExporterPolicy,
  renderUnsupportedExporterPolicy
} = require('../../out/exporters/unsupported-policy');
const { ReactExporter } = require('../../out/exporters/react-exporter');
const { PugExporter } = require('../../out/exporters/pug-exporter');

describe('exporter unsupported policy', () => {
  it('declares unsupported as an explicit capability support state', () => {
    assert.deepStrictEqual(
      [...EXPORTER_CAPABILITY_SUPPORT_STATES].sort(),
      ['native', 'static', 'unsupported']
    );
  });

  it('renders unsupported as an explicit placeholder policy, not a silent fallback', () => {
    const policy = createUnsupportedExporterPolicy('react', 'ExperimentalPanel');

    assert.deepStrictEqual(policy, {
      support: 'unsupported',
      format: 'react',
      componentName: 'ExperimentalPanel',
      emission: 'placeholder-comment',
      reason: 'missing-renderer-capability'
    });
    assert.strictEqual(
      renderUnsupportedExporterPolicy(policy),
      '      {/* 未対応コンポーネント: ExperimentalPanel (capability: unsupported) */}'
    );
  });

  it('uses explicit unsupported policy from legacy React and Pug exporter paths', async () => {
    const dsl = {
      page: {
        components: [{ ExperimentalPanel: { title: 'not yet supported' } }]
      }
    };

    const react = await new ReactExporter().export(dsl, { format: 'react' });
    const pug = await new PugExporter().export(dsl, { format: 'pug' });

    assert.match(react, /未対応コンポーネント: ExperimentalPanel \(capability: unsupported\)/);
    assert.match(pug, /未対応コンポーネント: ExperimentalPanel \(capability: unsupported\)/);
  });

  it('escapes comment terminators in unsupported component labels', () => {
    const rendered = renderUnsupportedExporterPolicy(
      createUnsupportedExporterPolicy('html', 'Bad--Name*/Next')
    );

    assert.ok(rendered.includes('Bad- -Name* /Next'));
    assert.ok(!rendered.includes('Bad--Name*/Next'));
  });
});
