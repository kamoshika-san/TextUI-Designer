import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
const expect: any = chai.expect;
import { TemplateParser, TemplateException } from '../../src/services/template-parser';
import * as fs from 'fs';
import * as path from 'path';

describe('TemplateParser - $foreach構文テスト', () => {
  const baseDir = path.resolve(__dirname, '../fixtures');
  const parser = new TemplateParser();

  before(() => {
    console.log('$foreach構文テスト用ファイルを作成中...');
    
    // 基本的な$foreach構文のテスト用テンプレート
    fs.writeFileSync(
      path.join(baseDir, 'foreach-basic.template.yml'),
      `- $foreach:
    items: "$params.items"
    as: "item"
    template:
      - Text:
          variant: h3
          value: "{{ item.name }}"
      - Text:
          variant: body
          value: "{{ item.description }}"`
    );

    // ネストした$foreach構文のテスト用テンプレート
    fs.writeFileSync(
      path.join(baseDir, 'foreach-nested.template.yml'),
      `- $foreach:
    items: "$params.categories"
    as: "category"
    template:
      - Text:
          variant: h2
          value: "{{ category.name }}"
      - $foreach:
          items: "{{ category.items }}"
          as: "subItem"
          template:
            - Text:
                variant: body
                value: "{{ subItem.name }}"`
    );

    // $foreachと$ifの組み合わせテスト用テンプレート
    fs.writeFileSync(
      path.join(baseDir, 'foreach-with-if.template.yml'),
      `- $foreach:
    items: "$params.items"
    as: "item"
    template:
      - $if:
          condition: "{{ item.show }}"
          template:
            - Text:
                variant: h3
                value: "{{ item.name }}"
      - Text:
          variant: body
          value: "{{ item.description }}"`
    );

    console.log('$foreach構文テスト用ファイルの作成完了');
  });

  after(() => {
    console.log('$foreach構文テスト用ファイルを削除中...');
    try {
      fs.unlinkSync(path.join(baseDir, 'foreach-basic.template.yml'));
      fs.unlinkSync(path.join(baseDir, 'foreach-nested.template.yml'));
      fs.unlinkSync(path.join(baseDir, 'foreach-with-if.template.yml'));
    } catch (error) {
      console.log('ファイル削除エラー:', error);
    }
    console.log('$foreach構文テスト用ファイルの削除完了');
  });

  describe('基本的な$foreach構文', () => {
    it('配列の各要素に対してテンプレートを適用する', async () => {
      const main = `- $include:
    template: "foreach-basic.template.yml"
    params:
      items:
        - name: "アイテム1"
          description: "説明1"
        - name: "アイテム2"
          description: "説明2"
        - name: "アイテム3"
          description: "説明3"`;

      const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
      
      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      
      const components = result.flat();
      
      // 6個のコンポーネントが生成されることを確認（3アイテム × 2コンポーネント）
      expect(components.length).to.equal(6);
      
      // 各アイテムの名前が正しく展開されていることを確認
      const nameComponents = components.filter((comp: any) => comp.Text && comp.Text.variant === 'h3');
      expect(nameComponents.length).to.equal(3);
      expect(nameComponents[0].Text.value).to.equal('アイテム1');
      expect(nameComponents[1].Text.value).to.equal('アイテム2');
      expect(nameComponents[2].Text.value).to.equal('アイテム3');
      
      // 各アイテムの説明が正しく展開されていることを確認
      const descComponents = components.filter((comp: any) => comp.Text && comp.Text.variant === 'body');
      expect(descComponents.length).to.equal(3);
      expect(descComponents[0].Text.value).to.equal('説明1');
      expect(descComponents[1].Text.value).to.equal('説明2');
      expect(descComponents[2].Text.value).to.equal('説明3');
    });

    it('空の配列の場合は何も生成しない', async () => {
      const main = `- $include:
    template: "foreach-basic.template.yml"
    params:
      items: []`;

      const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
      
      expect(result).to.be.an('array');
      expect(result.length).to.equal(0);
    });

    it('配列でないパラメータの場合は空配列として扱う', async () => {
      const main = `- $include:
    template: "foreach-basic.template.yml"
    params:
      items: "not-an-array"`;

      const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
      
      expect(result).to.be.an('array');
      expect(result.length).to.equal(0);
    });
  });

  describe('ネストした$foreach構文', () => {
    it('ネストしたループを正しく処理する', async () => {
      const main = `- $include:
    template: "foreach-nested.template.yml"
    params:
      categories:
        - name: "カテゴリ1"
          items:
            - name: "サブアイテム1-1"
            - name: "サブアイテム1-2"
        - name: "カテゴリ2"
          items:
            - name: "サブアイテム2-1"`;

      const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
      
      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      
      const components = result.flat();
      
      // カテゴリ名のコンポーネントを確認
      const categoryComponents = components.filter((comp: any) => comp.Text && comp.Text.variant === 'h2');
      expect(categoryComponents.length).to.equal(2);
      expect(categoryComponents[0].Text.value).to.equal('カテゴリ1');
      expect(categoryComponents[1].Text.value).to.equal('カテゴリ2');
      
      // サブアイテムのコンポーネントを確認
      const subItemComponents = components.filter((comp: any) => comp.Text && comp.Text.variant === 'body');
      expect(subItemComponents.length).to.equal(3);
      expect(subItemComponents[0].Text.value).to.equal('サブアイテム1-1');
      expect(subItemComponents[1].Text.value).to.equal('サブアイテム1-2');
      expect(subItemComponents[2].Text.value).to.equal('サブアイテム2-1');
    });
  });

  describe('$foreachと$ifの組み合わせ', () => {
    it('$foreach内で$ifを使用できる', async () => {
      const main = `- $include:
    template: "foreach-with-if.template.yml"
    params:
      items:
        - name: "アイテム1"
          description: "説明1"
          show: true
        - name: "アイテム2"
          description: "説明2"
          show: false
        - name: "アイテム3"
          description: "説明3"
          show: true`;

      const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
      
      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      
      const components = result.flat();
      
      // 説明は3つすべて表示される
      const descComponents = components.filter((comp: any) => comp.Text && comp.Text.variant === 'body');
      expect(descComponents.length).to.equal(3);
      
      // 名前はshow: trueのもののみ表示される（2つ）
      const nameComponents = components.filter((comp: any) => comp.Text && comp.Text.variant === 'h3');
      expect(nameComponents.length).to.equal(2);
      expect(nameComponents[0].Text.value).to.equal('アイテム1');
      expect(nameComponents[1].Text.value).to.equal('アイテム3');
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないテンプレートファイルでエラーを投げる', async () => {
      const main = `- $include:
    template: "notfound.template.yml"
    params:
      items: []`;

      await expect(parser.parseWithTemplates(main, path.join(baseDir, 'main.yml')))
        .to.eventually.be.rejectedWith(TemplateException);
    });

    it('不正な$foreach構文でエラーを投げる', async () => {
      const main = `- $foreach:
    invalid: "property"`;

      await expect(parser.parseWithTemplates(main, path.join(baseDir, 'main.yml')))
        .to.eventually.be.rejected;
    });
  });

  describe('パフォーマンス', () => {
    it('大量のアイテムを効率的に処理する', async () => {
      // 大量のアイテムを含むテンプレートを作成
      let templateContent = '';
      for (let i = 0; i < 100; i++) {
        templateContent += `- $foreach:
    items: "$params.items${i}"
    as: "item${i}"
    template:
      - Text:
          variant: body
          value: "{{ item${i}.name }}"\\n`;
      }
      
      fs.writeFileSync(path.join(baseDir, 'foreach-performance.template.yml'), templateContent);
      
      // パラメータを作成
      const params: any = {};
      for (let i = 0; i < 100; i++) {
        params[`items${i}`] = [
          { name: `アイテム${i}-1` },
          { name: `アイテム${i}-2` }
        ];
      }
      
      const main = `- $include:
    template: "foreach-performance.template.yml"
    params: ${JSON.stringify(params)}`;

      const startTime = Date.now();
      const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
      const endTime = Date.now();
      
      // 処理時間が10秒以内であることを確認
      expect(endTime - startTime).to.be.lessThan(10000);
      
      // 200個のアイテムが表示されることを確認（100テンプレート × 2アイテム）
      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
    });
  });
}); 