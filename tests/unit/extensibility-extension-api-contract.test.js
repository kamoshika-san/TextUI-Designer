const assert = require('assert');

describe('拡張API契約', () => {
  describe('ExportManager の拡張ポイント', () => {
    let ExportManager;
    let manager;

    const dsl = {
      page: {
        id: 'page-1',
        title: 'sample',
        layout: 'vertical',
        components: []
      }
    };

    const customExporter = {
      export: async (inputDsl, options) => `custom:${inputDsl.page.id}:${options.format}`,
      getFileExtension: () => '.custom'
    };

    before(() => {
      ({ ExportManager } = require('../../out/exporters'));
    });

    beforeEach(() => {
      manager = new ExportManager();
    });

    afterEach(() => {
      manager.dispose();
    });

    it('registerExporter() で追加した形式を実行できる', async () => {
      manager.registerExporter('custom', customExporter);

      const result = await manager.exportWithDiffUpdate(dsl, { format: 'custom' });

      assert.strictEqual(result.result, 'custom:page-1:custom');
      assert.strictEqual(manager.getFileExtension('custom'), '.custom');
      assert.ok(manager.getSupportedFormats().includes('custom'));
    });

    it('unregisterExporter() 後は形式が利用できない', async () => {
      manager.registerExporter('custom', customExporter);
      const removed = manager.unregisterExporter('custom');

      assert.strictEqual(removed, true);
      assert.strictEqual(manager.getFileExtension('custom'), '');
      assert.ok(!manager.getSupportedFormats().includes('custom'));

      await assert.rejects(
        () => manager.exportWithDiffUpdate(dsl, { format: 'custom' }),
        /Unsupported export format/
      );
    });
  });

  describe('BaseComponentRenderer の拡張ポイント', () => {
    const { BaseComponentRenderer } = require('../../out/exporters/legacy/base-component-renderer');

    class TestRenderer extends BaseComponentRenderer {
      constructor() {
        super('html');
      }

      async export() {
        return '';
      }

      getFileExtension() {
        return '.txt';
      }

      renderText() {
        return '';
      }

      renderInput() {
        return '';
      }

      renderButton() {
        return '';
      }

      renderCheckbox() {
        return '';
      }

      renderRadio() {
        return '';
      }

      renderSelect() {
        return '';
      }

      renderDivider() {
        return '';
      }

      renderAlert() {
        return '';
      }

      renderContainer() {
        return '';
      }

      renderForm() {
        return '';
      }
    }

    it('registerComponentHandler() で未知コンポーネントを描画できる', () => {
      const renderer = new TestRenderer();
      renderer.registerComponentHandler('Custom', (props, key) => `custom:${props.value}:${key}`);

      const output = renderer.renderComponent({ Custom: { value: 'ok' } }, 7);

      assert.strictEqual(output, 'custom:ok:7');
      assert.ok(renderer.getRegisteredComponents().includes('Custom'));
    });
  });

  describe('WebView コンポーネントレジストリ', () => {
    let registerWebViewComponent;
    let getWebViewComponentRenderer;
    let getRegisteredWebViewComponents;
    let clearWebViewComponentRegistry;

    before(() => {
      ({
        registerWebViewComponent,
        getWebViewComponentRenderer,
        getRegisteredWebViewComponents,
        clearWebViewComponentRegistry
      } = require('../../out/registry/webview-component-registry'));
    });

    beforeEach(() => {
      clearWebViewComponentRegistry();
    });

    afterEach(() => {
      clearWebViewComponentRegistry();
      require('../../out/renderer/component-map').registerBuiltInComponents();
    });

    it('registerWebViewComponent() でレンダラー登録・取得ができる', () => {
      registerWebViewComponent('CustomCard', (props, key) => ({ props, key }));

      const renderer = getWebViewComponentRenderer('CustomCard');
      assert.strictEqual(typeof renderer, 'function');
      assert.deepStrictEqual(renderer({ title: 'demo' }, 2), {
        props: { title: 'demo' },
        key: 2
      });
      assert.ok(getRegisteredWebViewComponents().includes('CustomCard'));
    });
  });
});
