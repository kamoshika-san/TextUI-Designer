const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const extractZip = require('../../vendor/extract-zip');
const { assertSymlinkTargetWithinDir } = extractZip;

const IFLNK = 0o120777;
const IFREG = 0o100644;

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content, 'utf8');
    const crc = crc32(data);
    const unixMode = entry.unixMode ?? IFREG;
    const extAttr = (unixMode << 16) >>> 0;
    const versionMadeBy = 3 << 8;

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(versionMadeBy, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(extAttr, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);

    localParts.push(local, data);
    centralParts.push(central);
    offset += local.length + data.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDir, eocd]);
}

describe('extract-zip CVE-2026-56876 symlink traversal', () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-extract-zip-'));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('rejects a relative symlink that escapes the extraction directory', async () => {
    const zipPath = path.join(tempRoot, 'escape.zip');
    const destDir = path.join(tempRoot, 'out');
    fs.writeFileSync(zipPath, createStoredZip([
      { name: 'evil-link', content: '../../../../etc/passwd', unixMode: IFLNK }
    ]));

    await assert.rejects(
      () => extractZip(zipPath, { dir: destDir }),
      /Out of bound symlink target/
    );
    assert.strictEqual(fs.existsSync(path.join(destDir, 'evil-link')), false);
  });

  it('rejects an absolute symlink target', async () => {
    const zipPath = path.join(tempRoot, 'absolute.zip');
    const destDir = path.join(tempRoot, 'out');
    fs.writeFileSync(zipPath, createStoredZip([
      { name: 'abs-link', content: path.resolve(tempRoot, 'secret'), unixMode: IFLNK }
    ]));

    await assert.rejects(
      () => extractZip(zipPath, { dir: destDir }),
      /Out of bound symlink target/
    );
  });

  it('extracts a regular file and an in-tree relative symlink', async () => {
    const zipPath = path.join(tempRoot, 'safe.zip');
    const destDir = path.join(tempRoot, 'out');
    fs.writeFileSync(zipPath, createStoredZip([
      { name: 'docs/readme.txt', content: 'hello' },
      { name: 'docs/alias.txt', content: 'readme.txt', unixMode: IFLNK }
    ]));

    await extractZip(zipPath, { dir: destDir });

    assert.strictEqual(fs.readFileSync(path.join(destDir, 'docs/readme.txt'), 'utf8'), 'hello');
    assert.strictEqual(fs.readlinkSync(path.join(destDir, 'docs/alias.txt')), 'readme.txt');
    assert.strictEqual(fs.readFileSync(path.join(destDir, 'docs/alias.txt'), 'utf8'), 'hello');
  });

  it('keeps in-tree relative targets and rejects drive-escaping relatives', () => {
    const extractDir = path.join(tempRoot, 'out');
    const destPath = path.join(extractDir, 'docs', 'link');
    assert.doesNotThrow(() => {
      assertSymlinkTargetWithinDir('../readme.txt', destPath, extractDir, 'docs/link');
    });
    assert.throws(
      () => assertSymlinkTargetWithinDir('../../outside', destPath, extractDir, 'docs/link'),
      /Out of bound symlink target/
    );
  });
});
