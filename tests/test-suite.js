/**
 * TextUI Designer テストスイート
 * 
 * このファイルは、TextUI Designer拡張のすべてのテストを統合して実行します。
 * テストは以下のカテゴリに分類されています：
 * 
 * - E2E Tests: エンドツーエンドテスト（実際のUI操作をシミュレート）
 * - Integration Tests: 統合テスト（コンポーネント間の連携）
 * - Unit Tests: 単体テスト（個別の関数やクラス）
 */

const fs = require('fs');
const path = require('path');

// テスト結果を格納するオブジェクト
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// テスト実行のログを記録
const testLog = [];

/**
 * テストを実行する関数
 * @param {string} testName - テスト名
 * @param {Function} testFunction - テスト関数
 */
function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n🧪 実行中: ${testName}`);
  
  try {
    testFunction();
    testResults.passed++;
    console.log(`✅ 成功: ${testName}`);
    testLog.push(`✅ ${testName} - 成功`);
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({
      test: testName,
      error: error.message,
      stack: error.stack
    });
    console.log(`❌ 失敗: ${testName}`);
    console.log(`   エラー: ${error.message}`);
    testLog.push(`❌ ${testName} - 失敗: ${error.message}`);
  }
}

/**
 * テスト結果を表示する関数
 */
function displayResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(60));
  console.log(`総テスト数: ${testResults.total}`);
  console.log(`成功: ${testResults.passed} ✅`);
  console.log(`失敗: ${testResults.failed} ❌`);
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n📋 エラー詳細:');
    testResults.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. ${error.test}`);
      console.log(`   エラー: ${error.error}`);
    });
  }
  
  console.log('\n📝 テストログ:');
  testLog.forEach(log => console.log(log));
  
  console.log('\n' + '='.repeat(60));
}

/**
 * E2Eテストを実行する関数
 */
function runE2ETests() {
  console.log('\n🚀 E2Eテストを開始します...');
  
  // E2Eテストファイルを動的に読み込み
  const e2eTestDir = path.join(__dirname, 'e2e');
  const e2eTestFiles = fs.readdirSync(e2eTestDir).filter(file => file.endsWith('.js'));
  
  e2eTestFiles.forEach(testFile => {
    const testPath = path.join(e2eTestDir, testFile);
    const testModule = require(testPath);
    
    if (typeof testModule.runTest === 'function') {
      runTest(`E2E: ${testFile}`, () => testModule.runTest());
    } else {
      console.log(`⚠️  警告: ${testFile} に runTest 関数が見つかりません`);
    }
  });
}

/**
 * 統合テストを実行する関数
 */
function runIntegrationTests() {
  console.log('\n🔗 統合テストを開始します...');
  
  // 統合テストファイルを動的に読み込み
  const integrationTestDir = path.join(__dirname, 'integration');
  if (fs.existsSync(integrationTestDir)) {
    const integrationTestFiles = fs.readdirSync(integrationTestDir).filter(file => file.endsWith('.js'));
    
    integrationTestFiles.forEach(testFile => {
      const testPath = path.join(integrationTestDir, testFile);
      const testModule = require(testPath);
      
      if (typeof testModule.runTest === 'function') {
        runTest(`Integration: ${testFile}`, () => testModule.runTest());
      } else {
        console.log(`⚠️  警告: ${testFile} に runTest 関数が見つかりません`);
      }
    });
  } else {
    console.log('ℹ️  統合テストディレクトリが存在しません');
  }
}

/**
 * 単体テストを実行する関数
 */
function runUnitTests() {
  console.log('\n�� 単体テストを開始します...');
  // 単体テストファイルを動的に読み込み
  const unitTestDir = path.join(__dirname, 'unit');
  if (fs.existsSync(unitTestDir)) {
    const unitTestFiles = fs.readdirSync(unitTestDir)
      .filter(file => file.endsWith('.js') && file !== 'refactoring-test.js'); // 除外
    unitTestFiles.forEach(testFile => {
      const testPath = path.join(unitTestDir, testFile);
      const testModule = require(testPath);
      if (typeof testModule.runTest === 'function') {
        runTest(`Unit: ${testFile}`, () => testModule.runTest());
      } else {
        console.log(`⚠️  警告: ${testFile} に runTest 関数が見つかりません`);
      }
    });
  } else {
    console.log('ℹ️  単体テストディレクトリが存在しません');
  }
}

/**
 * リファクタリングテストを実行する関数
 */
function runRefactoringTests() {
  console.log('\n🔧 リファクタリングテストを開始します...');
  const refactoringTestFile = path.join(__dirname, 'unit', 'refactoring-test.js');
  if (fs.existsSync(refactoringTestFile)) {
    const refactoringTests = require(refactoringTestFile);
    Object.entries(refactoringTests).forEach(([name, fn]) => {
      runTest(`Refactoring: ${name}`, fn);
    });
  } else {
    console.log('ℹ️  リファクタリングテストファイルが存在しません');
  }
}

/**
 * メイン実行関数
 */
function runAllTests() {
  console.log('🎯 TextUI Designer テストスイートを開始します...');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  // 各テストカテゴリを実行
  runUnitTests();
  runIntegrationTests();
  runE2ETests();
  runRefactoringTests();
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  // 結果を表示
  displayResults();
  
  console.log(`\n⏱️  実行時間: ${duration.toFixed(2)}秒`);
  
  // 終了コードを設定
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// コマンドライン引数に基づいてテストを実行
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
TextUI Designer テストスイート

使用方法:
  node tests/test-suite.js [オプション]

オプション:
  --unit, -u          単体テストのみ実行
  --integration, -i   統合テストのみ実行
  --e2e, -e           E2Eテストのみ実行
  --refactoring, -r   リファクタリングテストのみ実行
  --help, -h          このヘルプを表示

例:
  node tests/test-suite.js --unit
  node tests/test-suite.js --e2e
  node tests/test-suite.js --refactoring
  node tests/test-suite.js          # すべてのテストを実行
`);
  process.exit(0);
}

if (args.includes('--unit') || args.includes('-u')) {
  runUnitTests();
  displayResults();
  process.exit(testResults.failed > 0 ? 1 : 0);
} else if (args.includes('--integration') || args.includes('-i')) {
  runIntegrationTests();
  displayResults();
  process.exit(testResults.failed > 0 ? 1 : 0);
} else if (args.includes('--e2e') || args.includes('-e')) {
  runE2ETests();
  displayResults();
  process.exit(testResults.failed > 0 ? 1 : 0);
} else if (args.includes('--refactoring') || args.includes('-r')) {
  runRefactoringTests();
  displayResults();
  process.exit(testResults.failed > 0 ? 1 : 0);
} else {
  runAllTests();
}

module.exports = {
  runTest,
  runAllTests,
  runUnitTests,
  runIntegrationTests,
  runE2ETests,
  runRefactoringTests,
  displayResults
}; 