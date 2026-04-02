const assert = require('assert');
const path = require('path');
const { loadDslWithIncludesFromPath } = require('../../out/dsl/load-dsl-with-includes');
const { ReactExporter } = require('../../out/exporters/react-exporter');
const { PugExporter } = require('../../out/exporters/pug-exporter');

function buildDebug(output, sampleRelativePath, marker, dsl) {
  return [
    `sample: ${sampleRelativePath}`,
    `missing marker: ${marker}`,
    `page title: ${dsl?.page?.title ?? '<missing>'}`,
    `component count: ${Array.isArray(dsl?.page?.components) ? dsl.page.components.length : '<non-array>'}`,
    `output preview: ${JSON.stringify(String(output).slice(0, 320))}`
  ].join('\n');
}

async function exportSample(sampleRelativePath, Exporter, format) {
  const repoRoot = path.resolve(__dirname, '../..');
  const samplePath = path.join(repoRoot, sampleRelativePath);
  const { dsl } = loadDslWithIncludesFromPath(samplePath);
  const output = await new Exporter().export(dsl, { format });
  return { dsl, output };
}

describe('Modal sample regression across React/Pug exporters (T-20260402-607)', () => {
  const sampleRelativePath = 'sample/09-modal/sample.tui.yml';

  [
    {
      name: 'React',
      Exporter: ReactExporter,
      format: 'react',
      markers: [
        'textui-modal',
        '{"削除の確認"}',
        '{"削除する"}',
        'bg-transparent border border-gray-500 text-gray-300 hover:bg-gray-700/30',
        'bg-blue-600 hover:bg-blue-700 text-white',
        '{"ユーザー詳細"}',
      ],
      nonMarkers: [
        '{"非表示モーダル"}',
      ]
    },
    {
      name: 'Pug',
      Exporter: PugExporter,
      format: 'pug',
      markers: [
        '.textui-modal',
        '削除の確認',
        '削除する',
        'bg-transparent border border-gray-500 text-gray-300 hover:bg-gray-700/30',
        'bg-blue-600 hover:bg-blue-700 text-white',
        'ユーザー詳細',
      ],
      nonMarkers: [
        '非表示モーダル',
      ]
    }
  ].forEach(({ name, Exporter, format, markers, nonMarkers }) => {
    it(`${sampleRelativePath} keeps modal regression markers on ${name}`, async () => {
      const { dsl, output } = await exportSample(sampleRelativePath, Exporter, format);

      assert.ok(
        dsl && dsl.page && Array.isArray(dsl.page.components) && dsl.page.components.length > 0,
        `Expected sample DSL to load components before export\nsample: ${sampleRelativePath}\npage title: ${dsl?.page?.title ?? '<missing>'}`
      );

      markers.forEach(marker => {
        assert.ok(
          output.includes(marker),
          `Expected ${name} export for ${sampleRelativePath} to include marker: ${marker}\n${buildDebug(output, sampleRelativePath, marker, dsl)}`
        );
      });

      nonMarkers.forEach(marker => {
        assert.ok(
          !output.includes(marker),
          `Expected ${name} export for ${sampleRelativePath} to omit marker: ${marker}\n${buildDebug(output, sampleRelativePath, marker, dsl)}`
        );
      });
    });
  });
});
