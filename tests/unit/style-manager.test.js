/**
 * StyleManagerの基本テスト
 */

const assert = require('assert');
const { describe, it } = require('mocha');

const StyleManager = require('../../out/utils/style-manager.js').StyleManager;

describe('StyleManager', () => {
  describe('CSSオブジェクト→文字列変換', () => {
    it('HTMLフォーマットでスタイル設定が正しく取得できる', () => {
      const styles = StyleManager.getStyles('html');
      
      // バリアントクラスが存在する
      assert.ok(styles.variantClasses);
      assert.ok(styles.variantClasses.h1);
      assert.ok(styles.variantClasses.h2);
      assert.ok(styles.variantClasses.p);
      
      // ボタン種別クラスが存在する
      assert.ok(styles.kindClasses);
      assert.ok(styles.kindClasses.primary);
      assert.ok(styles.kindClasses.secondary);
      
      // サイズクラスが存在する
      assert.ok(styles.sizeClasses);
      assert.ok(styles.sizeClasses.xs);
      assert.ok(styles.sizeClasses.lg);
    });

    it('Reactフォーマットでスタイル設定が正しく取得できる', () => {
      const styles = StyleManager.getStyles('react');
      
      // React用のスタイルが存在する
      assert.ok(styles.variantClasses);
      assert.ok(styles.kindClasses);
      assert.ok(styles.sizeClasses);
      
      // HTMLと異なるスタイルが適用されている
      const htmlStyles = StyleManager.getStyles('html');
      assert.notStrictEqual(styles.variantClasses.h1, htmlStyles.variantClasses.h1);
    });

    it('Pugフォーマットでスタイル設定が正しく取得できる', () => {
      const styles = StyleManager.getStyles('pug');
      
      // Pug用のスタイルが存在する
      assert.ok(styles.variantClasses);
      assert.ok(styles.kindClasses);
      assert.ok(styles.sizeClasses);
      
      // Reactと同じスタイルが適用されている
      const reactStyles = StyleManager.getStyles('react');
      assert.strictEqual(styles.variantClasses.h1, reactStyles.variantClasses.h1);
    });
  });

  describe('テーマ適用時のスタイル上書き', () => {
    it('異なるフォーマットでスタイルが上書きされる', () => {
      const htmlVariantClasses = StyleManager.getVariantClasses('html');
      const reactVariantClasses = StyleManager.getVariantClasses('react');
      
      // HTMLとReactで異なるスタイルが適用される
      assert.notStrictEqual(htmlVariantClasses.h1, reactVariantClasses.h1);
      assert.notStrictEqual(htmlVariantClasses.p, reactVariantClasses.p);
      
      // HTMLは暗いテーマ（text-gray-300）
      assert.ok(htmlVariantClasses.h1.includes('text-gray-300'));
      // Reactは明るいテーマ（text-gray-900）
      assert.ok(reactVariantClasses.h1.includes('text-gray-900'));
    });

    it('ボタン種別でスタイルが正しく適用される', () => {
      const htmlKindClasses = StyleManager.getKindClasses('html');
      const reactKindClasses = StyleManager.getKindClasses('react');
      
      // primaryボタンのスタイルが異なる
      assert.notStrictEqual(htmlKindClasses.primary, reactKindClasses.primary);
      
      // HTMLはより詳細なスタイル（focus:outline-none等）
      assert.ok(htmlKindClasses.primary.includes('focus:outline-none'));
      // Reactはシンプルなスタイル
      assert.ok(reactKindClasses.primary.includes('bg-blue-600'));
    });

    it('テキストバリアント設定が正しく取得できる', () => {
      const htmlConfig = StyleManager.getTextVariantConfig('h1', 'html');
      const reactConfig = StyleManager.getTextVariantConfig('h1', 'react');
      
      // 要素名とクラス名が正しく設定されている
      assert.strictEqual(htmlConfig.element, 'h1');
      assert.ok(htmlConfig.className);
      
      // フォーマットによってクラス名が異なる
      assert.notStrictEqual(htmlConfig.className, reactConfig.className);
    });

    it('ボタン種別クラスが正しく取得できる', () => {
      const htmlPrimaryClass = StyleManager.getButtonKindClass('primary', 'html');
      const reactPrimaryClass = StyleManager.getButtonKindClass('primary', 'react');
      
      // クラス名が取得できる
      assert.ok(htmlPrimaryClass);
      assert.ok(reactPrimaryClass);
      
      // フォーマットによってクラス名が異なる
      assert.notStrictEqual(htmlPrimaryClass, reactPrimaryClass);
    });
  });

  describe('デフォルトフォーマット', () => {
    it('未対応フォーマットでHTMLスタイルがデフォルトとして返される', () => {
      const defaultStyles = StyleManager.getStyles('unknown');
      const htmlStyles = StyleManager.getStyles('html');
      
      // デフォルトでHTMLスタイルが返される
      assert.deepStrictEqual(defaultStyles, htmlStyles);
    });
  });
}); 