/**
 * CacheManagerの基本テスト
 */

const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('assert');

// VSCode APIのモック
const mockVscode = {
  ExtensionContext: class {
    constructor() {
      this.subscriptions = [];
      this.extensionPath = __dirname + '/../../';
    }
  }
};

// グローバルにvscodeを設定
global.vscode = mockVscode;

// vscodeモジュールをモック
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return mockVscode;
  }
  return originalRequire.apply(this, arguments);
};

// テスト対象のモジュールを読み込み
const path = require('path');
const CacheManager = require('../../out/utils/cache-manager.js').CacheManager;

describe('CacheManager', () => {
  let cacheManager;

  beforeEach(() => {
    // 各テスト前に新しいCacheManagerインスタンスを作成
    cacheManager = new CacheManager();
  });

  afterEach(() => {
    // 各テスト後にキャッシュをクリア
    if (cacheManager) {
      cacheManager.clear();
    }
  });

  describe('基本機能', () => {
    it('値をセットし、同じキーで取得できる', () => {
      const testDsl = { type: 'container', children: [] };
      const testContent = '<div>test</div>';
      const format = 'html';

      // 値をセット
      cacheManager.set(testDsl, format, testContent);

      // 同じキーで値を取得
      const result = cacheManager.get(testDsl, format);

      assert.strictEqual(result, testContent);
    });

    it('存在しないキーでnullが返る', () => {
      const testDsl = { type: 'container', children: [] };
      const format = 'html';

      // 存在しないキーで値を取得
      const result = cacheManager.get(testDsl, format);

      assert.strictEqual(result, null);
    });

    it('削除後に値が取得できない', () => {
      const testDsl = { type: 'container', children: [] };
      const testContent = '<div>test</div>';
      const format = 'html';

      // 値をセット
      cacheManager.set(testDsl, format, testContent);

      // 値を取得できることを確認
      let result = cacheManager.get(testDsl, format);
      assert.strictEqual(result, testContent);

      // キャッシュをクリア
      cacheManager.clear();

      // 削除後に値が取得できないことを確認
      result = cacheManager.get(testDsl, format);
      assert.strictEqual(result, null);
    });
  });

  describe('フォーマット別キャッシュ', () => {
    it('異なるフォーマットで別々にキャッシュされる', () => {
      const testDsl = { type: 'container', children: [] };
      const htmlContent = '<div>html</div>';
      const reactContent = 'React.createElement("div", null, "react")';

      // HTMLフォーマットでキャッシュ
      cacheManager.set(testDsl, 'html', htmlContent);
      
      // Reactフォーマットでキャッシュ
      cacheManager.set(testDsl, 'react', reactContent);

      // それぞれ正しく取得できる
      assert.strictEqual(cacheManager.get(testDsl, 'html'), htmlContent);
      assert.strictEqual(cacheManager.get(testDsl, 'react'), reactContent);
    });

    it('特定フォーマットのキャッシュを削除できる', () => {
      const testDsl = { type: 'container', children: [] };
      const htmlContent = '<div>html</div>';
      const reactContent = 'React.createElement("div", null, "react")';

      // 両方のフォーマットでキャッシュ
      cacheManager.set(testDsl, 'html', htmlContent);
      cacheManager.set(testDsl, 'react', reactContent);

      // HTMLフォーマットのみ削除
      cacheManager.clearFormat('html');

      // HTMLは削除され、Reactは残る
      assert.strictEqual(cacheManager.get(testDsl, 'html'), null);
      assert.strictEqual(cacheManager.get(testDsl, 'react'), reactContent);
    });
  });

  describe('キャッシュ統計', () => {
    it('キャッシュ統計が正しく取得できる', () => {
      const stats = cacheManager.getStats();

      assert.ok(stats.hasOwnProperty('size'));
      assert.ok(stats.hasOwnProperty('maxSize'));
      assert.ok(stats.hasOwnProperty('hitRate'));

      assert.strictEqual(typeof stats.size, 'number');
      assert.strictEqual(typeof stats.maxSize, 'number');
      assert.strictEqual(typeof stats.hitRate, 'number');
    });

    it('キャッシュサイズが正しく反映される', () => {
      const testDsl1 = { type: 'container', children: [] };
      const testDsl2 = { type: 'text', content: 'test' };

      // 初期状態
      let stats = cacheManager.getStats();
      assert.strictEqual(stats.size, 0);

      // 1つ追加
      cacheManager.set(testDsl1, 'html', '<div>test1</div>');
      stats = cacheManager.getStats();
      assert.strictEqual(stats.size, 1);

      // 2つ追加
      cacheManager.set(testDsl2, 'html', '<div>test2</div>');
      stats = cacheManager.getStats();
      assert.strictEqual(stats.size, 2);

      // クリア後
      cacheManager.clear();
      stats = cacheManager.getStats();
      assert.strictEqual(stats.size, 0);
    });

    it('ヒット率が正しく計算される', () => {
      const testDsl1 = { type: 'container', children: [] };
      const testDsl2 = { type: 'text', content: 'test' };
      const content1 = '<div>test1</div>';

      // 初期状態：アクセスなしの場合はヒット率0
      let stats = cacheManager.getStats();
      assert.strictEqual(stats.hitRate, 0);

      // 値をセット
      cacheManager.set(testDsl1, 'html', content1);

      // 存在しないキーでアクセス（ミス）
      cacheManager.get(testDsl2, 'html');
      stats = cacheManager.getStats();
      assert.strictEqual(stats.hitRate, 0); // 0ヒット / 1アクセス = 0%

      // 存在するキーでアクセス（ヒット）
      cacheManager.get(testDsl1, 'html');
      stats = cacheManager.getStats();
      assert.strictEqual(stats.hitRate, 50); // 1ヒット / 2アクセス = 50%

      // もう一度ヒット
      cacheManager.get(testDsl1, 'html');
      stats = cacheManager.getStats();
      assert.strictEqual(stats.hitRate, 66.67); // 2ヒット / 3アクセス = 66.67%
    });

    it('詳細統計が正しく取得できる', () => {
      const testDsl = { type: 'container', children: [] };
      const content = '<div>test</div>';

      // 値をセット
      cacheManager.set(testDsl, 'html', content);

      // ミス
      cacheManager.get({ type: 'text', content: 'nonexistent' }, 'html');
      
      // ヒット
      cacheManager.get(testDsl, 'html');
      cacheManager.get(testDsl, 'html');

      const detailedStats = cacheManager.getDetailedStats();

      assert.ok(detailedStats.hasOwnProperty('size'));
      assert.ok(detailedStats.hasOwnProperty('maxSize'));
      assert.ok(detailedStats.hasOwnProperty('hits'));
      assert.ok(detailedStats.hasOwnProperty('misses'));
      assert.ok(detailedStats.hasOwnProperty('hitRate'));
      assert.ok(detailedStats.hasOwnProperty('totalAccesses'));

      assert.strictEqual(detailedStats.hits, 2);
      assert.strictEqual(detailedStats.misses, 1);
      assert.strictEqual(detailedStats.totalAccesses, 3);
      assert.strictEqual(detailedStats.hitRate, 66.67); // 2/3 * 100 = 66.67%
    });

    it('統計リセットが正しく動作する', () => {
      const testDsl = { type: 'container', children: [] };
      const content = '<div>test</div>';

      // 値をセットしてアクセス
      cacheManager.set(testDsl, 'html', content);
      cacheManager.get(testDsl, 'html'); // ヒット

      // 統計確認
      let stats = cacheManager.getDetailedStats();
      assert.strictEqual(stats.hits, 1);
      assert.strictEqual(stats.misses, 0);

      // 統計リセット
      cacheManager.resetStats();

      // リセット後の統計確認
      stats = cacheManager.getDetailedStats();
      assert.strictEqual(stats.hits, 0);
      assert.strictEqual(stats.misses, 0);
      assert.strictEqual(stats.hitRate, 0);
      assert.strictEqual(stats.totalAccesses, 0);
    });

    it('clear()でヒット率統計もリセットされる', () => {
      const testDsl = { type: 'container', children: [] };
      const content = '<div>test</div>';

      // 値をセットしてアクセス
      cacheManager.set(testDsl, 'html', content);
      cacheManager.get(testDsl, 'html'); // ヒット

      // clear()実行
      cacheManager.clear();

      // 統計確認
      const stats = cacheManager.getDetailedStats();
      assert.strictEqual(stats.size, 0);
      assert.strictEqual(stats.hits, 0);
      assert.strictEqual(stats.misses, 0);
      assert.strictEqual(stats.hitRate, 0);
    });

    it('TTL期限切れでミスとしてカウントされる', (done) => {
      // TTLを短く設定したキャッシュマネージャーを作成
      const shortTtlCacheManager = new CacheManager({ ttl: 50 }); // 50ms

      const testDsl = { type: 'container', children: [] };
      const content = '<div>test</div>';

      // 値をセット
      shortTtlCacheManager.set(testDsl, 'html', content);

      // 期限切れ前のアクセス（ヒット）
      let result = shortTtlCacheManager.get(testDsl, 'html');
      assert.strictEqual(result, content);

      setTimeout(() => {
        // 期限切れ後のアクセス（ミス）
        result = shortTtlCacheManager.get(testDsl, 'html');
        assert.strictEqual(result, null);

        // 統計確認
        const stats = shortTtlCacheManager.getDetailedStats();
        assert.strictEqual(stats.hits, 1);
        assert.strictEqual(stats.misses, 1);
        assert.strictEqual(stats.hitRate, 50); // 1/2 * 100 = 50%

        done();
      }, 100); // TTLより長く待機
    });
  });

  describe('オプション設定', () => {
    it('カスタムオプションで初期化できる', () => {
      const customOptions = {
        ttl: 60000, // 60秒
        maxSize: 50 // 50エントリ
      };

      const customCacheManager = new CacheManager(customOptions);
      const stats = customCacheManager.getStats();

      assert.strictEqual(stats.maxSize, 50);
    });

    it('デフォルトオプションが適用される', () => {
      const defaultCacheManager = new CacheManager();
      const stats = defaultCacheManager.getStats();

      assert.strictEqual(stats.maxSize, 100); // デフォルト値
    });
  });

  describe('クリーンアップ機能', () => {
    it('期限切れエントリのクリーンアップが動作する', (done) => {
      // TTLを短く設定したキャッシュマネージャーを作成
      const shortTtlCacheManager = new CacheManager({ ttl: 100 }); // 100ms

      const testDsl = { type: 'container', children: [] };
      const testContent = '<div>test</div>';

      // 値をセット
      shortTtlCacheManager.set(testDsl, 'html', testContent);

      // すぐには取得できる
      assert.strictEqual(shortTtlCacheManager.get(testDsl, 'html'), testContent);

      // 少し待ってからクリーンアップ
      setTimeout(() => {
        shortTtlCacheManager.cleanup();
        
        // 期限切れで取得できない
        assert.strictEqual(shortTtlCacheManager.get(testDsl, 'html'), null);
        done();
      }, 150);
    });
  });
}); 