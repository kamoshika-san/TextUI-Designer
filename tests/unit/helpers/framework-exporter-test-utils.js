const assert = require('assert');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const repoRoot = path.resolve(__dirname, '../../..');

function loadSample(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return yaml.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function assertRepresentativeMarkup(output, wrapperTag) {
  const wrapperPattern = new RegExp(`<${wrapperTag}[\\s\\S]*class="textui-generated"[\\s\\S]*>`);

  assert.match(output, wrapperPattern);
  assert.match(output, /TextUI Designer - All Components/);
  assert.match(output, /class="[^"]*textui-progress[^"]*"/);
  assert.match(output, /Overview Tab/);
  assert.match(output, /<table[\s\S]*Alice[\s\S]*Admin[\s\S]*<\/table>/);
}

module.exports = {
  loadSample,
  assertRepresentativeMarkup
};
