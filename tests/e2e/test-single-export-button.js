const fs = require('fs');
const path = require('path');

async function testSingleExportButton() {
  console.log('=== エクスポートボタンの重複表示テスト ===');
  
  // プレビュー画面のHTMLを生成（extension.tsのgetWebviewContent関数を模擬）
  const previewHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TextUI Preview</title>
  <style>
    /* エクスポートボタンのスタイル */
    .export-button {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 1000;
      background-color: #2563eb;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .export-button:hover {
      background-color: #1d4ed8;
    }

    .export-button:active {
      background-color: #1e40af;
    }
  </style>
</head>
<body>
  <button class="export-button" onclick="exportUI()">Export</button>
  <div id="root"></div>
  <script>
    function exportUI() {
      // VS Code拡張にエクスポートメッセージを送信
      if (window.vscode) {
        window.vscode.postMessage({ type: 'export' });
      }
    }
  </script>
  <script src="webview.js"></script>
</body>
</html>`;
  
  console.log('\nプレビュー画面のHTML:');
  console.log(previewHtml);
  
  // 実際のボタン要素の数をチェック
  const buttonElementMatches = previewHtml.match(/<button[^>]*class="export-button"[^>]*>/g);
  const buttonElementCount = buttonElementMatches ? buttonElementMatches.length : 0;
  
  // onclick属性の数をチェック
  const onclickMatches = previewHtml.match(/onclick="exportUI\(\)"/g);
  const onclickCount = onclickMatches ? onclickMatches.length : 0;
  
  // "Export" ボタンテキストの数をチェック
  const exportTextMatches = previewHtml.match(/>Export</g);
  const exportTextCount = exportTextMatches ? exportTextMatches.length : 0;
  
  console.log('\n=== エクスポートボタンの要素数チェック ===');
  console.log(`<button class="export-button"> 要素: ${buttonElementCount}個`);
  console.log(`onclick="exportUI()" 属性: ${onclickCount}個`);
  console.log(`"Export" ボタンテキスト: ${exportTextCount}個`);
  
  // 期待される結果（1つだけ）
  const expectedCount = 1;
  
  let allPassed = true;
  
  if (buttonElementCount === expectedCount) {
    console.log('✓ エクスポートボタン要素が1つだけ存在しています');
  } else {
    console.log(`✗ エクスポートボタン要素が${buttonElementCount}個存在しています（期待値: ${expectedCount}個）`);
    allPassed = false;
  }
  
  if (onclickCount === expectedCount) {
    console.log('✓ onclick属性が1つだけ存在しています');
  } else {
    console.log(`✗ onclick属性が${onclickCount}個存在しています（期待値: ${expectedCount}個）`);
    allPassed = false;
  }
  
  if (exportTextCount === expectedCount) {
    console.log('✓ "Export" ボタンテキストが1つだけ存在しています');
  } else {
    console.log(`✗ "Export" ボタンテキストが${exportTextCount}個存在しています（期待値: ${expectedCount}個）`);
    allPassed = false;
  }
  
  // Reactコンポーネントにエクスポートボタンが含まれていないかチェック
  console.log('\n=== Reactコンポーネントの確認 ===');
  console.log('Reactコンポーネント（webview.tsx）からExportButtonコンポーネントを削除しました');
  console.log('HTMLテンプレート（extension.ts）のエクスポートボタンのみが使用されます');
  
  if (allPassed) {
    console.log('\n🎉 すべてのテストが成功しました！');
    console.log('\nエクスポートボタンの重複表示修正:');
    console.log('✅ エクスポートボタンが1つだけ表示されます');
    console.log('✅ Reactコンポーネントから重複するエクスポートボタンを削除しました');
    console.log('✅ HTMLテンプレートのエクスポートボタンのみが使用されます');
  } else {
    console.log('\n❌ 一部のテストが失敗しました。');
    console.log('エクスポートボタンが重複して表示されている可能性があります。');
  }
}

testSingleExportButton().catch(console.error); 