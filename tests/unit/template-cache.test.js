const { expect } = require('chai');
const { describe, it, beforeEach, afterEach } = require('mocha');
const fs = require('fs');
const path = require('path');
const { TemplateCacheService } = require('../../out/services/template-cache');

describe('TemplateCacheService', () => {
  let cacheService;
  let testDir;
  let testFiles;

  beforeEach(() => {
    // テスト用のディレクトリとファイルを作成
    testDir = path.join(__dirname, 'test-cache-temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // テスト用のテンプレートファイルを作成
    testFiles = {
      simple: path.join(testDir, 'simple.template.yml'),
      withDeps: path.join(testDir, 'with-deps.template.yml'),
      dependent: path.join(testDir, 'dependent.template.yml'),
      circular1: path.join(testDir, 'circular1.template.yml'),
      circular2: path.join(testDir, 'circular2.template.yml')
    };

    // ファイル内容を作成
    fs.writeFileSync(testFiles.simple, `
- Text:
    variant: h1
    value: "{{ $params.title }}"
`);

    fs.writeFileSync(testFiles.withDeps, `
- $include:
    template: "./simple.template.yml"
    params:
      title: "依存テンプレート"
`);

    fs.writeFileSync(testFiles.dependent, `
- Container:
    components:
      - $include:
          template: "./with-deps.template.yml"
`);

    fs.writeFileSync(testFiles.circular1, `
- $include:
    template: "./circular2.template.yml"
`);

    fs.writeFileSync(testFiles.circular2, `
- $include:
    template: "./circular1.template.yml"
`);

    // キャッシュサービスを初期化
    cacheService = new TemplateCacheService({
      maxCacheSize: 10, // 10MB（テスト用に小さく設定）
      maxEntries: 50,
      maxAge: 10000, // 10秒
      cleanupInterval: 5000, // 5秒
      memoryPressureThreshold: 20 // 20MB
    });
  });

  afterEach(() => {
    // キャッシュサービスを破棄
    if (cacheService) {
      cacheService.dispose();
    }

    // テストファイルを削除
    try {
      for (const file of Object.values(testFiles)) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }
      if (fs.existsSync(testDir)) {
        fs.rmdirSync(testDir);
      }
    } catch (error) {
      console.warn('テストファイルの削除に失敗しました:', error);
    }
  });

  describe('基本的なキャッシュ機能', () => {
    it('テンプレートファイルを正しく読み込める', async () => {
      const template = await cacheService.getTemplate(testFiles.simple);
      
      expect(template).to.exist;
      expect(template.filePath).to.equal(testFiles.simple);
      expect(template.content).to.include('variant: h1');
      expect(template.parsedData).to.be.an('array');
      expect(template.size).to.be.greaterThan(0);
      expect(template.accessCount).to.equal(1);
    });

    it('同じファイルの2回目アクセスでキャッシュヒットする', async () => {
      // 1回目のアクセス
      const template1 = await cacheService.getTemplate(testFiles.simple);
      const stats1 = cacheService.getStats();
      
      // 2回目のアクセス
      const template2 = await cacheService.getTemplate(testFiles.simple);
      const stats2 = cacheService.getStats();
      
      expect(template1.filePath).to.equal(template2.filePath);
      expect(template2.accessCount).to.equal(2);
      expect(stats2.hits).to.equal(1);
      expect(stats2.misses).to.equal(1);
      expect(stats2.hitRate).to.be.approximately(0.5, 0.01);
    });

    it('ファイルが更新されたときにキャッシュが無効化される', async () => {
      // 初回読み込み
      const template1 = await cacheService.getTemplate(testFiles.simple);
      const originalContent = template1.content;
      
      // ファイルを更新（少し待機してタイムスタンプを変更）
      await new Promise(resolve => setTimeout(resolve, 100));
      fs.writeFileSync(testFiles.simple, `
- Text:
    variant: h2
    value: "更新されたテンプレート"
`);
      
      // 再読み込み
      const template2 = await cacheService.getTemplate(testFiles.simple);
      
      expect(template2.content).to.not.equal(originalContent);
      expect(template2.content).to.include('variant: h2');
      expect(template2.content).to.include('更新されたテンプレート');
    });
  });

  describe('依存関係の追跡', () => {
    it('依存関係を正しく抽出できる', async () => {
      const template = await cacheService.getTemplate(testFiles.withDeps);
      
      expect(template.dependencies.size).to.equal(1);
      expect(Array.from(template.dependencies)[0]).to.include('simple.template.yml');
    });

    it('依存されているテンプレートに正しくdependentsが設定される', async () => {
      // 依存関係のあるテンプレートを読み込み
      await cacheService.getTemplate(testFiles.withDeps);
      
      // 依存されているテンプレートの情報を取得
      const simpleInfo = cacheService.getTemplateInfo(testFiles.simple);
      
      expect(simpleInfo).to.exist;
      expect(simpleInfo.dependents.size).to.equal(1);
      expect(Array.from(simpleInfo.dependents)[0]).to.include('with-deps.template.yml');
    });

    it('ネストした依存関係を正しく処理できる', async () => {
      const template = await cacheService.getTemplate(testFiles.dependent);
      
      // dependent -> with-deps -> simple の依存関係チェーン
      const dependentInfo = cacheService.getTemplateInfo(testFiles.dependent);
      const withDepsInfo = cacheService.getTemplateInfo(testFiles.withDeps);
      const simpleInfo = cacheService.getTemplateInfo(testFiles.simple);
      
      expect(dependentInfo.dependencies.size).to.equal(1);
      expect(withDepsInfo.dependencies.size).to.equal(1);
      expect(withDepsInfo.dependents.size).to.equal(1);
      expect(simpleInfo.dependents.size).to.equal(1);
    });

    it('依存されているファイルが更新されたときに関連ファイルも無効化される', async () => {
      // 依存関係チェーンをすべて読み込み
      await cacheService.getTemplate(testFiles.dependent);
      
      const initialStats = cacheService.getStats();
      expect(initialStats.totalEntries).to.equal(3); // dependent, with-deps, simple
      
      // 基底のテンプレートを無効化
      cacheService.invalidateTemplate(testFiles.simple);
      
      const afterStats = cacheService.getStats();
      // simpleが無効化されると、それに依存するwith-depsと、さらにそれに依存するdependentも無効化される
      expect(afterStats.totalEntries).to.equal(0); // 全て無効化される
      expect(afterStats.invalidations).to.be.greaterThan(0);
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないファイルでエラーが発生する', async () => {
      const nonExistentFile = path.join(testDir, 'non-existent.template.yml');
      
      try {
        await cacheService.getTemplate(nonExistentFile);
        expect.fail('エラーが発生するべきです');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('不正なYAMLファイルでもキャッシュできる', async () => {
      const invalidYamlFile = path.join(testDir, 'invalid.template.yml');
      fs.writeFileSync(invalidYamlFile, 'invalid: yaml: content: [unclosed');
      
      const template = await cacheService.getTemplate(invalidYamlFile);
      
      expect(template).to.exist;
      expect(template.content).to.include('invalid: yaml');
      expect(template.parsedData).to.be.null; // パースエラーでnull
    });
  });

  describe('メモリ管理', () => {
    it('キャッシュ統計情報を正しく取得できる', async () => {
      await cacheService.getTemplate(testFiles.simple);
      await cacheService.getTemplate(testFiles.withDeps);
      
      const stats = cacheService.getStats();
      
      expect(stats.totalEntries).to.be.greaterThan(0);
      expect(stats.totalSize).to.be.greaterThan(0);
      expect(stats.hits).to.be.a('number');
      expect(stats.misses).to.be.a('number');
      expect(stats.hitRate).to.be.a('number');
      expect(stats.memoryUsage).to.be.a('number');
    });

    it('キャッシュをクリアできる', async () => {
      await cacheService.getTemplate(testFiles.simple);
      await cacheService.getTemplate(testFiles.withDeps);
      
      const beforeStats = cacheService.getStats();
      expect(beforeStats.totalEntries).to.be.greaterThan(0);
      
      cacheService.clear();
      
      const afterStats = cacheService.getStats();
      expect(afterStats.totalEntries).to.equal(0);
      expect(afterStats.totalSize).to.equal(0);
    });

    it('キャッシュされているテンプレート一覧を取得できる', async () => {
      await cacheService.getTemplate(testFiles.simple);
      await cacheService.getTemplate(testFiles.withDeps);
      
      const cachedTemplates = cacheService.getCachedTemplates();
      
      expect(cachedTemplates).to.be.an('array');
      expect(cachedTemplates.length).to.be.greaterThan(0);
      expect(cachedTemplates.some(path => path.includes('simple.template.yml'))).to.be.true;
    });

    it('特定のテンプレート詳細情報を取得できる', async () => {
      await cacheService.getTemplate(testFiles.simple);
      
      const info = cacheService.getTemplateInfo(testFiles.simple);
      
      expect(info).to.exist;
      expect(info.filePath).to.include('simple.template.yml');
      expect(info.accessCount).to.equal(1);
      expect(info.lastAccessed).to.be.a('number');
    });
  });

  describe('パフォーマンス', () => {
    it('大量のテンプレートファイルを効率的に処理できる', async () => {
      const largeTemplateCount = 20;
      const largeTestFiles = [];
      
      // 大量のテンプレートファイルを作成
      for (let i = 0; i < largeTemplateCount; i++) {
        const file = path.join(testDir, `large-${i}.template.yml`);
        fs.writeFileSync(file, `
- Text:
    variant: p
    value: "テンプレート ${i}"
`);
        largeTestFiles.push(file);
      }
      
      const startTime = Date.now();
      
      // 全ファイルを読み込み
      for (const file of largeTestFiles) {
        await cacheService.getTemplate(file);
      }
      
      // 再度アクセス（キャッシュヒット）
      for (const file of largeTestFiles) {
        await cacheService.getTemplate(file);
      }
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      const stats = cacheService.getStats();
      
      expect(stats.totalEntries).to.equal(largeTemplateCount);
      expect(stats.hitRate).to.equal(0.5); // 50%がキャッシュヒット
      expect(processingTime).to.be.lessThan(5000); // 5秒以内で処理完了
      
      // テストファイルをクリーンアップ
      for (const file of largeTestFiles) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }
    });

    it('キャッシュヒットとミスが正しく記録される', async () => {
      // 初回アクセス（ミス）
      await cacheService.getTemplate(testFiles.simple);
      let stats = cacheService.getStats();
      expect(stats.misses).to.equal(1);
      expect(stats.hits).to.equal(0);
      
      // 2回目アクセス（ヒット）
      await cacheService.getTemplate(testFiles.simple);
      stats = cacheService.getStats();
      expect(stats.misses).to.equal(1);
      expect(stats.hits).to.equal(1);
      expect(stats.hitRate).to.be.approximately(0.5, 0.01);
      
      // 別ファイルのアクセス（ミス）- 依存関係の自動読み込みはヒット数にカウントされない
      await cacheService.getTemplate(testFiles.withDeps);
      stats = cacheService.getStats();
      expect(stats.misses).to.equal(2); // with-deps(新規ミス)
      expect(stats.hits).to.equal(1); // simple再アクセスのみ
    });
  });

  describe('設定のカスタマイズ', () => {
    it('カスタム設定でキャッシュサービスを作成できる', () => {
      const customCacheService = new TemplateCacheService({
        maxCacheSize: 100,
        maxEntries: 500,
        maxAge: 60000,
        cleanupInterval: 10000,
        memoryPressureThreshold: 200
      });
      
      expect(customCacheService).to.exist;
      
      // クリーンアップ
      customCacheService.dispose();
    });
  });

  describe('メモリ圧迫テスト', () => {
    beforeEach(() => {
      // テスト環境を明示的に設定
      process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    it('テスト環境では設定が自動調整される', async () => {
      const cacheService = new TemplateCacheService({
        memoryPressureThreshold: 1, // 1MB（非常に低い値）
        maxCacheSize: 1
      });

      // テスト環境では自動的に200MB、100MBに調整される
      const templatePath = path.join(testDir, 'memory-test.template.yml');
      const templateContent = 'name: test\ncomponents:\n  - type: text\n    text: "Memory Test"';
      await fs.promises.writeFile(templatePath, templateContent);

      // テンプレートを読み込み
      await cacheService.getTemplate(templatePath);
      
      // 小さなメモリ使用量でも積極的クリーンアップが実行されないことを確認
      // （テスト環境では閾値が自動調整されるため）
      const stats1 = cacheService.getStats();
      expect(stats1.totalEntries).to.equal(1);
      
      // 再度アクセスしてキャッシュヒットすることを確認
      await cacheService.getTemplate(templatePath);
      const stats2 = cacheService.getStats();
      expect(stats2.hits).to.be.greaterThan(0);
      expect(stats2.totalEntries).to.equal(1); // キャッシュが保持されている

      cacheService.dispose();
    });
  });
}); 