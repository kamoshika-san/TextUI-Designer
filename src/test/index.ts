// Mochaのグローバルを明示的に設定
const mocha = require('mocha');
global.describe = mocha.describe;
global.it = mocha.it;
global.beforeEach = mocha.beforeEach;
global.afterEach = mocha.afterEach;

import './extension.test';
import './regression.test'; 