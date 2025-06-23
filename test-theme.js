const yaml = require('yaml');
const fs = require('fs');
const path = require('path');

try {
  const themePath = path.join(__dirname, '..', 'textui-theme.yml');
  console.log('Testing theme file at:', themePath);
  
  const content = fs.readFileSync(themePath, 'utf-8');
  const data = yaml.parse(content);
  console.log('YAML parsing successful');
  console.log('Theme name:', data.theme?.name);
  console.log('Tokens count:', Object.keys(data.theme?.tokens || {}).length);
  console.log('Components count:', Object.keys(data.theme?.components || {}).length);
  console.log('Available tokens:', Object.keys(data.theme?.tokens || {}));
  console.log('Available components:', Object.keys(data.theme?.components || {}));
  
  // トークンの詳細を確認
  if (data.theme?.tokens) {
    console.log('\nToken details:');
    for (const [tokenName, tokenValue] of Object.entries(data.theme.tokens)) {
      console.log(`  ${tokenName}:`, typeof tokenValue === 'object' ? Object.keys(tokenValue) : tokenValue);
    }
  }
  
  // コンポーネントの詳細を確認
  if (data.theme?.components) {
    console.log('\nComponent details:');
    for (const [componentName, componentValue] of Object.entries(data.theme.components)) {
      console.log(`  ${componentName}:`, typeof componentValue === 'object' ? Object.keys(componentValue) : componentValue);
    }
  }
} catch (err) {
  console.error('YAML parsing failed:', err.message);
} 