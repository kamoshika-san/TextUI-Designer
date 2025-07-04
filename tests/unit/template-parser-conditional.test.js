"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const chai = require("chai");
const chaiAsPromised = require('chai-as-promised').default;
chai.use(chaiAsPromised);
const expect = chai.expect;
const template_parser_1 = require("../../out/src/services/template-parser.js");
const fs = require("fs");
const path = require("path");
(0, mocha_1.describe)('TemplateParser - $if構文テスト', () => {
    const baseDir = path.resolve(__dirname, '../fixtures');
    const parser = new template_parser_1.TemplateParser();
    (0, mocha_1.before)(() => {
        console.log('$if構文テスト用ファイルを作成中...');
        // 基本的な$if構文のテスト用テンプレート
        fs.writeFileSync(path.join(baseDir, 'conditional-basic.template.yml'), `- $if:
    condition: "$params.showHeader"
    template:
      - Text:
          variant: h1
          value: "{{ $params.title }}"
- $if:
    condition: "$params.showDescription"
    template:
      - Text:
          variant: body
          value: "{{ $params.description }}"
- $if:
    condition: "$params.showForm"
    template:
      - Form:
          id: "{{ $params.formId }}"
          fields:
            - Input:
                label: "{{ $params.nameLabel }}"
                name: name
                type: text
- $if:
    condition: "$params.showFooter"
    template:
      - Text:
          variant: caption
          value: "{{ $params.footerText }}"`);
        // ネストした$if構文のテスト用テンプレート
        fs.writeFileSync(path.join(baseDir, 'conditional-nested.template.yml'), `- $if:
    condition: "$params.showSection"
    template:
      - Container:
          id: "section"
          children:
            - $if:
                condition: "$params.showTitle"
                template:
                  - Text:
                      variant: h2
                      value: "{{ $params.sectionTitle }}"
            - $if:
                condition: "$params.showContent"
                template:
                  - Text:
                      variant: body
                      value: "{{ $params.sectionContent }}"`);
        // 複雑な条件式のテスト用テンプレート
        fs.writeFileSync(path.join(baseDir, 'conditional-complex.template.yml'), `- $if:
    condition: "true"
    template:
      - Text:
          variant: h1
          value: "常に表示される"
- $if:
    condition: "false"
    template:
      - Text:
          variant: h1
          value: "表示されない"
- $if:
    condition: "$params.userType"
    template:
      - Text:
          variant: h2
          value: "ユーザータイプ: {{ $params.userType }}"
- $if:
    condition: "$params.isAdmin"
    template:
      - Button:
          label: "管理者機能"
          kind: primary`);
        // $includeと$ifの組み合わせテスト用テンプレート
        fs.writeFileSync(path.join(baseDir, 'conditional-with-include.template.yml'), `- $if:
    condition: "$params.showHeader"
    template:
      - $include:
          template: "conditional-basic.template.yml"
          params:
            title: "{{ $params.title }}"
            showHeader: false
            showDescription: "{{ $params.showDescription }}"
            description: "{{ $params.description }}"
            showForm: "{{ $params.showForm }}"
            formId: "{{ $params.formId }}"
            nameLabel: "{{ $params.nameLabel }}"
            showFooter: "{{ $params.showFooter }}"
            footerText: "{{ $params.footerText }}"`);
        console.log('$if構文テスト用ファイルの作成完了');
    });
    (0, mocha_1.after)(() => {
        console.log('$if構文テスト用ファイルを削除中...');
        try {
            fs.unlinkSync(path.join(baseDir, 'conditional-basic.template.yml'));
            fs.unlinkSync(path.join(baseDir, 'conditional-nested.template.yml'));
            fs.unlinkSync(path.join(baseDir, 'conditional-complex.template.yml'));
            fs.unlinkSync(path.join(baseDir, 'conditional-with-include.template.yml'));
        }
        catch (error) {
            console.log('ファイル削除エラー:', error);
        }
        console.log('$if構文テスト用ファイルの削除完了');
    });
    (0, mocha_1.describe)('基本的な$if構文', () => {
        (0, mocha_1.it)('条件が真の場合、テンプレートを展開する', async () => {
            const main = `- $include:
    template: "conditional-basic.template.yml"
    params:
      showHeader: true
      title: "テストタイトル"
      showDescription: true
      description: "テスト説明"
      showForm: true
      formId: "test-form"
      nameLabel: "名前"
      showFooter: true
      footerText: "フッターテキスト"`;
            const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
            // 結果が配列であることを確認
            expect(result).to.be.an('array');
            expect(result.length).to.be.greaterThan(0);
            // 各条件に対応するコンポーネントが存在することを確認
            const components = result.flat();
            // ヘッダーが存在することを確認
            const headerComponent = components.find((comp) => comp.Text && comp.Text.variant === 'h1');
            expect(headerComponent).to.exist;
            expect(headerComponent.Text.value).to.equal('テストタイトル');
            // 説明が存在することを確認
            const descriptionComponent = components.find((comp) => comp.Text && comp.Text.variant === 'body');
            expect(descriptionComponent).to.exist;
            expect(descriptionComponent.Text.value).to.equal('テスト説明');
            // フォームが存在することを確認
            const formComponent = components.find((comp) => comp.Form);
            expect(formComponent).to.exist;
            expect(formComponent.Form.id).to.equal('test-form');
            // フッターが存在することを確認
            const footerComponent = components.find((comp) => comp.Text && comp.Text.variant === 'caption');
            expect(footerComponent).to.exist;
            expect(footerComponent.Text.value).to.equal('フッターテキスト');
        });
        (0, mocha_1.it)('条件が偽の場合、テンプレートをスキップする', async () => {
            const main = `- $include:
    template: "conditional-basic.template.yml"
    params:
      showHeader: false
      title: "テストタイトル"
      showDescription: false
      description: "テスト説明"
      showForm: false
      formId: "test-form"
      nameLabel: "名前"
      showFooter: false
      footerText: "フッターテキスト"`;
            const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
            // 結果が空の配列であることを確認
            expect(result).to.be.an('array');
            expect(result.length).to.equal(0);
        });
        (0, mocha_1.it)('一部の条件のみ真の場合、対応するテンプレートのみ展開する', async () => {
            const main = `- $include:
    template: "conditional-basic.template.yml"
    params:
      showHeader: true
      title: "テストタイトル"
      showDescription: false
      description: "テスト説明"
      showForm: true
      formId: "test-form"
      nameLabel: "名前"
      showFooter: false
      footerText: "フッターテキスト"`;
            const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
            // 結果が配列であることを確認
            expect(result).to.be.an('array');
            expect(result.length).to.be.greaterThan(0);
            const components = result.flat();
            // ヘッダーが存在することを確認
            const headerComponent = components.find((comp) => comp.Text && comp.Text.variant === 'h1');
            expect(headerComponent).to.exist;
            expect(headerComponent.Text.value).to.equal('テストタイトル');
            // 説明が存在しないことを確認
            const descriptionComponent = components.find((comp) => comp.Text && comp.Text.variant === 'body');
            expect(descriptionComponent).to.be.undefined;
            // フォームが存在することを確認
            const formComponent = components.find((comp) => comp.Form);
            expect(formComponent).to.exist;
            expect(formComponent.Form.id).to.equal('test-form');
            // フッターが存在しないことを確認
            const footerComponent = components.find((comp) => comp.Text && comp.Text.variant === 'caption');
            expect(footerComponent).to.be.undefined;
        });
    });
    (0, mocha_1.describe)('ネストした$if構文', () => {
        (0, mocha_1.it)('ネストした条件分岐を正しく処理する', async () => {
            const main = `- $include:
    template: "conditional-nested.template.yml"
    params:
      showSection: true
      showTitle: true
      sectionTitle: "セクションタイトル"
      showContent: true
      sectionContent: "セクションコンテンツ"`;
            const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
            expect(result).to.be.an('array');
            expect(result.length).to.be.greaterThan(0);
            const components = result.flat();
            // Containerが存在することを確認
            const containerComponent = components.find((comp) => comp.Container);
            expect(containerComponent).to.exist;
            expect(containerComponent.Container.id).to.equal('section');
            // タイトルとコンテンツが存在することを確認
            const titleComponent = containerComponent.Container.children.find((comp) => comp.Text && comp.Text.variant === 'h2');
            expect(titleComponent).to.exist;
            expect(titleComponent.Text.value).to.equal('セクションタイトル');
            const contentComponent = containerComponent.Container.children.find((comp) => comp.Text && comp.Text.variant === 'body');
            expect(contentComponent).to.exist;
            expect(contentComponent.Text.value).to.equal('セクションコンテンツ');
        });
        (0, mocha_1.it)('外側の条件が偽の場合、内側の条件も処理されない', async () => {
            const main = `- $include:
    template: "conditional-nested.template.yml"
    params:
      showSection: false
      showTitle: true
      sectionTitle: "セクションタイトル"
      showContent: true
      sectionContent: "セクションコンテンツ"`;
            const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
            // 結果が空の配列であることを確認
            expect(result).to.be.an('array');
            expect(result.length).to.equal(0);
        });
    });
    (0, mocha_1.describe)('複雑な条件式', () => {
        (0, mocha_1.it)('文字列"true"の条件を正しく評価する', async () => {
            const main = `- $include:
    template: "conditional-complex.template.yml"
    params:
      userType: "admin"
      isAdmin: true`;
            const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
            expect(result).to.be.an('array');
            expect(result.length).to.be.greaterThan(0);
            const components = result.flat();
            // "常に表示される"テキストが存在することを確認
            const alwaysText = components.find((comp) => comp.Text && comp.Text.value === '常に表示される');
            expect(alwaysText).to.exist;
            // "表示されない"テキストが存在しないことを確認
            const neverText = components.find((comp) => comp.Text && comp.Text.value === '表示されない');
            expect(neverText).to.be.undefined;
            // ユーザータイプテキストが存在することを確認
            const userTypeText = components.find((comp) => comp.Text && comp.Text.value === 'ユーザータイプ: admin');
            expect(userTypeText).to.exist;
            // 管理者ボタンが存在することを確認
            const adminButton = components.find((comp) => comp.Button && comp.Button.label === '管理者機能');
            expect(adminButton).to.exist;
        });
        (0, mocha_1.it)('空文字列やnullの条件を正しく評価する', async () => {
            const main = `- $include:
    template: "conditional-complex.template.yml"
    params:
      userType: ""
      isAdmin: null`;
            const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
            expect(result).to.be.an('array');
            expect(result.length).to.be.greaterThan(0);
            const components = result.flat();
            // "常に表示される"テキストのみが存在することを確認
            const alwaysText = components.find((comp) => comp.Text && comp.Text.value === '常に表示される');
            expect(alwaysText).to.exist;
            // 他の条件付きコンポーネントが存在しないことを確認
            expect(components.length).to.equal(1);
        });
    });
    (0, mocha_1.describe)('$includeと$ifの組み合わせ', () => {
        (0, mocha_1.it)('$if内で$includeを使用できる', async () => {
            const main = `- $include:
    template: "conditional-with-include.template.yml"
    params:
      showHeader: true
      title: "メインタイトル"
      showDescription: true
      description: "メイン説明"
      showForm: true
      formId: "main-form"
      nameLabel: "メイン名前"
      showFooter: true
      footerText: "メインフッター"`;
            const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
            expect(result).to.be.an('array');
            expect(result.length).to.be.greaterThan(0);
            const components = result.flat();
            // 説明、フォーム、フッターが存在することを確認（ヘッダーはfalseに設定されているため存在しない）
            const descriptionComponent = components.find((comp) => comp.Text && comp.Text.variant === 'body');
            expect(descriptionComponent).to.exist;
            expect(descriptionComponent.Text.value).to.equal('メイン説明');
            const formComponent = components.find((comp) => comp.Form);
            expect(formComponent).to.exist;
            expect(formComponent.Form.id).to.equal('main-form');
            const footerComponent = components.find((comp) => comp.Text && comp.Text.variant === 'caption');
            expect(footerComponent).to.exist;
            expect(footerComponent.Text.value).to.equal('メインフッター');
        });
    });
    (0, mocha_1.describe)('エラーハンドリング', () => {
        (0, mocha_1.it)('存在しないテンプレートファイルでエラーを投げる', async () => {
            const main = `- $include:
    template: "notfound.template.yml"
    params:
      showHeader: true`;
            await expect(parser.parseWithTemplates(main, path.join(baseDir, 'main.yml')))
                .to.eventually.be.rejectedWith(template_parser_1.TemplateException);
        });
        (0, mocha_1.it)('不正な$if構文でエラーを投げる', async () => {
            const main = `- $if:
    invalid: "property"`;
            await expect(parser.parseWithTemplates(main, path.join(baseDir, 'main.yml')))
                .to.eventually.be.rejected;
        });
    });
    (0, mocha_1.describe)('パフォーマンス', () => {
        (0, mocha_1.it)('大量の$if構文を効率的に処理する', async () => {
            // 大量の$if構文を含むテンプレートを作成
            let templateContent = '';
            for (let i = 0; i < 100; i++) {
                templateContent += `- $if:
    condition: "$params.showItem${i}"
    template:
      - Text:
          variant: body
          value: "アイテム${i}"
`;
            }
            fs.writeFileSync(path.join(baseDir, 'performance-test.template.yml'), templateContent);
            
            // パラメータを作成
            const params = {};
            for (let i = 0; i < 100; i++) {
                params[`showItem${i}`] = i % 2 === 0; // 偶数番号のみ表示
            }
            
            // パラメータをYAML形式で文字列化
            let paramsYaml = '';
            for (let i = 0; i < 100; i++) {
                paramsYaml += `      showItem${i}: ${i % 2 === 0}\n`;
            }
            
            const main = `- $include:
    template: "performance-test.template.yml"
    params:
${paramsYaml}`;
            
            const startTime = Date.now();
            const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
            const endTime = Date.now();
            
            // 処理時間が5秒以内であることを確認
            expect(endTime - startTime).to.be.lessThan(5000);
            
            // 50個のアイテムが表示されることを確認（偶数番号のみ）
            expect(result).to.be.an('array');
            expect(result.length).to.equal(50);
            
            // テストファイルを削除
            fs.unlinkSync(path.join(baseDir, 'performance-test.template.yml'));
        });
    });
});
