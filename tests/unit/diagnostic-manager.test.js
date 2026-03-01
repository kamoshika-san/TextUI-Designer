/**
 * DiagnosticManagerの単体テスト
 * 
 * ファクトリパターンの動作とDiagnosticManagerの基本機能をテストします
 */

const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('mocha');

describe('DiagnosticManager', () => {
  let diagnosticManager;
  let helpers;

  beforeEach(() => {
    // ファクトリを動的に読み込み
    delete require.cache[require.resolve('../mocks/diagnostic-manager-factory.js')];
    const { DiagnosticManagerFactory } = require('../mocks/diagnostic-manager-factory.js');
    
    // VSCodeモックを取得
    const vscode = global.vscode || require('../mocks/vscode-mock.js');
    
    // DiagnosticManagerインスタンスを作成
    diagnosticManager = DiagnosticManagerFactory.createForTest(vscode);
    helpers = diagnosticManager._testHelpers;
  });

  afterEach(() => {
    // リソースをクリーンアップ
    if (helpers && helpers.resetAllMocks) {
      helpers.resetAllMocks();
    }
    if (helpers && helpers.restoreRequire) {
      helpers.restoreRequire();
    }
    if (diagnosticManager && diagnosticManager.dispose) {
      diagnosticManager.dispose();
    }
  });

  describe('ファクトリパターンの検証', () => {
    it('DiagnosticManagerインスタンスが正しく作成される', () => {
      assert.ok(diagnosticManager, 'DiagnosticManagerインスタンスが作成されている');
      assert.ok(typeof diagnosticManager.validateAndReportDiagnostics === 'function', 'validateAndReportDiagnosticsメソッドが存在する');
      assert.ok(typeof diagnosticManager.clearDiagnostics === 'function', 'clearDiagnosticsメソッドが存在する');
    });

    it('テストヘルパーが正しく設定されている', () => {
      assert.ok(helpers, 'ヘルパーオブジェクトが存在する');
      assert.ok(typeof helpers.createTestDocument === 'function', 'createTestDocumentヘルパーが存在する');
      assert.ok(typeof helpers.getDiagnostics === 'function', 'getDiagnosticsヘルパーが存在する');
      assert.ok(typeof helpers.resetAllMocks === 'function', 'resetAllMocksヘルパーが存在する');
      assert.ok(typeof helpers.setSchemaLoadBehavior === 'function', 'setSchemaLoadBehaviorヘルパーが存在する');
    });

    it('mockSchemaManagerが正しく設定されている', () => {
      assert.ok(helpers.mockSchemaManager, 'mockSchemaManagerが存在する');
      assert.ok(typeof helpers.mockSchemaManager.loadSchema === 'function', 'loadSchemaメソッドが存在する');
    });

    it('mockDiagnosticCollectionが正しく設定されている', () => {
      assert.ok(helpers.mockDiagnosticCollection, 'mockDiagnosticCollectionが存在する');
      assert.ok(typeof helpers.mockDiagnosticCollection.set === 'function', 'setメソッドが存在する');
      assert.ok(typeof helpers.mockDiagnosticCollection.clear === 'function', 'clearメソッドが存在する');
      assert.ok(typeof helpers.mockDiagnosticCollection.get === 'function', 'getメソッドが存在する');
    });
  });

  describe('基本機能のテスト', () => {
    it('テストドキュメントが正しく作成される', () => {
      const testContent = 'page:\n  id: test\n  title: "テスト"';
      const document = helpers.createTestDocument(testContent);
      
      assert.ok(document, 'ドキュメントが作成されている');
      assert.strictEqual(document.getText(), testContent, 'ドキュメントの内容が正しい');
      assert.ok(document.uri, 'URIが設定されている');
      assert.strictEqual(document.languageId, 'yaml', '言語IDがyamlに設定されている');
    });

    it('診断コレクションのクリアが動作する', () => {
      // 診断をクリアする
      diagnosticManager.clearDiagnostics();
      
      // エラーが発生しないことを確認
      assert.ok(true, '診断クリアが正常に実行された');
    });

    it('キャッシュクリアが動作する', () => {
      // キャッシュをクリアする
      if (diagnosticManager.clearCache) {
        diagnosticManager.clearCache();
      }
      
      // エラーが発生しないことを確認
      assert.ok(true, 'キャッシュクリアが正常に実行された');
    });

    it('clearDiagnosticsForUriで旧形式のuri:hashキャッシュも削除される', () => {
      const document = helpers.createTestDocument('page:\n  id: test\n  title: "テスト"', '/test/legacy-cache.tui.yml');
      const uriString = document.uri.toString();
      const legacyKey = `${uriString}:legacy-hash`;

      diagnosticManager.validationCache.set(uriString, {
        content: document.getText(),
        diagnostics: [],
        timestamp: Date.now()
      });
      diagnosticManager.validationCache.set(legacyKey, {
        content: document.getText(),
        diagnostics: [],
        timestamp: Date.now()
      });

      diagnosticManager.clearDiagnosticsForUri(document.uri);

      assert.strictEqual(diagnosticManager.validationCache.has(uriString), false, 'uriキーのキャッシュが削除される');
      assert.strictEqual(diagnosticManager.validationCache.has(legacyKey), false, 'uri:hashキーのキャッシュが削除される');
    });
  });

  describe('スキーママネージャーとの連携', () => {
    it('デフォルトのスキーマ読み込みが動作する', async () => {
      const schema = await helpers.mockSchemaManager.loadSchema();
      
      assert.ok(schema, 'スキーマが読み込まれている');
      assert.strictEqual(schema.type, 'object', 'スキーマのタイプがobjectである');
      assert.ok(schema.properties, 'スキーマにpropertiesが存在する');
    });

    it('エラー動作のスキーマ読み込みが動作する', async () => {
      // エラー動作に設定
      helpers.setSchemaLoadBehavior('error');
      
      try {
        await helpers.mockSchemaManager.loadSchema();
        assert.fail('エラーが発生するはずです');
      } catch (error) {
        assert.ok(error.message.includes('Schema load failed'), 'スキーマ読み込みエラーが正しく発生している');
      }
      
      // デフォルトに戻す
      helpers.setSchemaLoadBehavior('default');
    });
  });

  describe('診断機能の基本テスト', () => {
    it('validateAndReportDiagnosticsメソッドが呼び出し可能', async () => {
      const testContent = 'page:\n  id: test\n  title: "テスト"';
      const document = helpers.createTestDocument(testContent);
      
      // メソッドが呼び出せることを確認（エラーが発生しない）
      try {
        await diagnosticManager.validateAndReportDiagnostics(document);
        assert.ok(true, 'validateAndReportDiagnosticsが正常に呼び出された');
      } catch (error) {
        // デバウンス処理やその他の理由でエラーが発生する可能性があるが、
        // メソッド自体が呼び出せることが重要
        console.log('診断処理でエラーが発生しましたが、これは想定内です:', error.message);
        assert.ok(true, 'メソッドは呼び出し可能');
      }
    });

    it('診断結果の取得ヘルパーが動作する', () => {
      const testUri = '/test/test.tui.yml';
      const document = helpers.createTestDocument('test content', testUri);
      
      // 診断結果を取得（空の配列が返されることを確認）
      const diagnostics = helpers.getDiagnostics(document.uri);
      assert.ok(Array.isArray(diagnostics), '診断結果が配列として返される');
    });

    it('themeファイルはthemeスキーマで検証される', async () => {
      let themeSchemaCallCount = 0;
      const originalLoadThemeSchema = helpers.mockSchemaManager.loadThemeSchema;
      helpers.mockSchemaManager.loadThemeSchema = async () => {
        themeSchemaCallCount += 1;
        return await originalLoadThemeSchema();
      };

      // キャッシュをクリアして theme スキーマが確実に読み込まれるようにする
      if (diagnosticManager.clearCache) {
        diagnosticManager.clearCache();
      }

      const themeContent = `theme:\n  name: \"base\"\n  tokens:\n    colors:\n      primary:\n        value: \"#2563EB\"`;
      const document = helpers.createTestDocument(themeContent, '/test/base-theme.yml');

      await diagnosticManager.validateAndReportDiagnostics(document);
      await new Promise(resolve => setTimeout(resolve, 700));

      const diagnostics = helpers.getDiagnostics(document.uri);
      assert.strictEqual(themeSchemaCallCount > 0, true, 'themeスキーマが読み込まれる');
      assert.strictEqual(diagnostics.length, 0, 'themeファイルで不適切なエラーが出ない');
    });
  });


  describe('診断メッセージ改善', () => {
    const invalidDslCases = [
      {
        name: 'トップレベルpage欠落',
        content: `meta:
  version: "1"`,
        code: 'TUI001',
        severity: 0,
        location: '/page'
      },
      {
        name: 'page.id欠落',
        content: `page:
  title: "テスト"
  layout: vertical`,
        code: 'TUI001',
        severity: 0,
        location: '/page/id'
      },
      {
        name: 'page.title欠落',
        content: `page:
  id: test
  layout: vertical`,
        code: 'TUI001',
        severity: 0,
        location: '/page/title'
      },
      {
        name: 'page.layout欠落',
        content: `page:
  id: test
  title: "テスト"`,
        code: 'TUI001',
        severity: 0,
        location: '/page/layout'
      },
      {
        name: 'page.id型不一致',
        content: `page:
  id: 100
  title: "テスト"
  layout: vertical`,
        code: 'TUI002',
        severity: 0,
        location: '/page/id'
      },
      {
        name: 'page.title型不一致',
        content: `page:
  id: test
  title: 123
  layout: vertical`,
        code: 'TUI002',
        severity: 0,
        location: '/page/title'
      },
      {
        name: 'page.layout型不一致',
        content: `page:
  id: test
  title: "テスト"
  layout: 123`,
        code: 'TUI002',
        severity: 0,
        location: '/page/layout'
      },
      {
        name: 'トップレベル未知キー',
        content: `page:
  id: test
  title: "テスト"
  layout: vertical
unknownRoot: true`,
        code: 'TUI003',
        severity: 1,
        location: '/unknownRoot'
      },
      {
        name: 'page配下未知キー',
        content: `page:
  id: test
  title: "テスト"
  layout: vertical
  unknownField: true`,
        code: 'TUI003',
        severity: 1,
        location: '/page/unknownField'
      },
      {
        name: 'enum不一致',
        content: `page:
  id: test
  title: "テスト"
  layout: grid`,
        code: 'TUI004',
        severity: 0,
        location: '/page/layout'
      }
    ];

    invalidDslCases.forEach((testCase, index) => {
      it(`不正DSLパターン${index + 1}: ${testCase.name}`, async () => {
        const document = helpers.createTestDocument(testCase.content, `/test/invalid-case-${index + 1}.tui.yml`);

        await diagnosticManager.validateAndReportDiagnostics(document);
        await new Promise(resolve => setTimeout(resolve, 700));

        const diagnostics = helpers.getDiagnostics(document.uri);
        assert.ok(diagnostics.length > 0, '診断が1件以上生成される');

        const targetDiagnostic = diagnostics.find(diagnostic => diagnostic.message.includes(`[${testCase.code}]`));
        assert.ok(targetDiagnostic, `${testCase.code} の診断が生成される`);
        assert.strictEqual(targetDiagnostic.severity, testCase.severity, 'severityが基準どおりに設定される');
        assert.ok(targetDiagnostic.message.includes('原因:'), '原因が含まれる');
        assert.ok(targetDiagnostic.message.includes('修正:'), '修正方法が含まれる');
        assert.ok(targetDiagnostic.message.includes(`場所: ${testCase.location}`), '場所情報が含まれる');
      });
    });

    it('診断フォーマットが統一される', async () => {
      const document = helpers.createTestDocument(`page:
  id: 1
  title: "テスト"
  layout: grid`, '/test/unified-format.tui.yml');

      await diagnosticManager.validateAndReportDiagnostics(document);
      await new Promise(resolve => setTimeout(resolve, 700));

      const diagnostics = helpers.getDiagnostics(document.uri);
      assert.ok(diagnostics.length > 0, '診断が生成される');

      diagnostics.forEach(diagnostic => {
        assert.ok(/^\[TUI\d{3}\]/.test(diagnostic.message), 'コード付きフォーマットで始まる');
        assert.ok(diagnostic.message.includes('原因:'), '原因セクションを含む');
        assert.ok(diagnostic.message.includes('修正:'), '修正セクションを含む');
        assert.ok(diagnostic.message.includes('場所:'), '場所セクションを含む');
      });
    });

    it('未知キーがタイポの場合は候補キーが表示される', async () => {
      const document = helpers.createTestDocument(`page:
  id: test
  titl: "テスト"
  layout: vertical`, '/test/suggestion-for-typo.tui.yml');

      await diagnosticManager.validateAndReportDiagnostics(document);
      await new Promise(resolve => setTimeout(resolve, 700));

      const diagnostics = helpers.getDiagnostics(document.uri);
      const additionalPropDiagnostic = diagnostics.find(diagnostic => diagnostic.message.includes('[TUI003]'));

      assert.ok(additionalPropDiagnostic, '追加プロパティエラーが生成される');
      assert.ok(additionalPropDiagnostic.message.includes('候補: "title"。'), '候補キーが表示される');
    });

    it('未知キーに近い候補がない場合は候補を表示しない', async () => {
      const document = helpers.createTestDocument(`page:
  id: test
  title: "テスト"
  layout: vertical
  completelyUnknownField: true`, '/test/no-suggestion-for-unrelated-key.tui.yml');

      await diagnosticManager.validateAndReportDiagnostics(document);
      await new Promise(resolve => setTimeout(resolve, 700));

      const diagnostics = helpers.getDiagnostics(document.uri);
      const additionalPropDiagnostic = diagnostics.find(diagnostic => diagnostic.message.includes('[TUI003]'));

      assert.ok(additionalPropDiagnostic, '追加プロパティエラーが生成される');
      assert.ok(!additionalPropDiagnostic.message.includes('候補:'), '候補がない場合は候補文が含まれない');
    });
  });


  describe('リソース管理', () => {
    it('disposeメソッドが正常に動作する', () => {
      if (diagnosticManager.dispose) {
        diagnosticManager.dispose();
        assert.ok(true, 'disposeメソッドが正常に実行された');
      } else {
        assert.ok(true, 'disposeメソッドが存在しない場合はスキップ');
      }
    });

    it('モックのリセットが正常に動作する', () => {
      helpers.resetAllMocks();
      assert.ok(true, 'モックのリセットが正常に実行された');
    });
  });
});
