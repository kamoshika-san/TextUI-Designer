const { HtmlExporter } = require('../../out/exporters/html-exporter');

// テスト用のDSL
const testDSL = {
  page: {
    components: [
      {
        Button: {
          kind: 'primary',
          label: 'Primary Button'
        }
      },
      {
        Button: {
          kind: 'secondary',
          label: 'Secondary Button'
        }
      },
      {
        Button: {
          kind: 'submit',
          label: 'Submit Button',
          submit: true
        }
      }
    ]
  }
};

async function testButtonColors() {
  console.log('=== ボタンの色テスト ===');
  
  const exporter = new HtmlExporter();
  const html = await exporter.export(testDSL, {});
  
  console.log('生成されたHTML:');
  console.log(html);
  
  // 期待されるクラスが含まれているかチェック
  const expectedClasses = [
    'bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
    'bg-gray-700 hover:bg-gray-600 text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500',
    'bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
  ];
  
  let allPassed = true;
  expectedClasses.forEach((expectedClass, index) => {
    const buttonTypes = ['primary', 'secondary', 'submit'];
    if (html.includes(expectedClass)) {
      console.log(`✓ ${buttonTypes[index]}ボタンのクラスが正しく適用されています`);
    } else {
      console.log(`✗ ${buttonTypes[index]}ボタンのクラスが適用されていません`);
      allPassed = false;
    }
  });
  
  // submit属性のテスト
  if (html.includes('type="submit"')) {
    console.log('✓ submit属性が正しく適用されています');
  } else {
    console.log('✗ submit属性が適用されていません');
    allPassed = false;
  }
  
  if (allPassed) {
    console.log('\n🎉 すべてのテストが成功しました！');
  } else {
    console.log('\n❌ 一部のテストが失敗しました。');
  }
}

testButtonColors().catch(console.error); 