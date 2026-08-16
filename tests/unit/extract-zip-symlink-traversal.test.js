const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const vendorExtractZip = require('../../vendor/extract-zip');
const installedExtractZip = require('extract-zip');
const { assertSymlinkTargetWithinDir } = vendorExtractZip;

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

  it('uses the installed extract-zip override, not only the vendor path', () => {
    const installed = require('extract-zip/package.json');
    assert.strictEqual(installed.version, '2.0.4');
    assert.strictEqual(installedExtractZip.assertSymlinkTargetWithinDir, vendorExtractZip.assertSymlinkTargetWithinDir);
  });

  it('rejects a relative symlink that escapes the extraction directory', async () => {
    const zipPath = path.join(tempRoot, 'escape.zip');
    const destDir = path.join(tempRoot, 'out');
    fs.writeFileSync(zipPath, createStoredZip([
      { name: 'evil-link', content: '../../../../etc/passwd', unixMode: IFLNK }
    ]));

    await assert.rejects(
      () => installedExtractZip(zipPath, { dir: destDir }),
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
      () => installedExtractZip(zipPath, { dir: destDir }),
      /Out of bound symlink target/
    );
  });

  it('rejects an intermediate in-tree directory symlink that would escape', async () => {
    const zipPath = path.join(tempRoot, 'via-dir-link.zip');
    const destDir = path.join(tempRoot, 'out');
    const secretPath = path.join(tempRoot, 'secret');
    fs.writeFileSync(secretPath, 'UNCHANGED');
    fs.writeFileSync(zipPath, createStoredZip([
      { name: 'inside/up', content: '..', unixMode: IFLNK },
      { name: 'inside/up/escape', content: '../secret', unixMode: IFLNK },
      { name: 'escape', content: 'PWNED' }
    ]));

    await assert.rejects(
      () => installedExtractZip(zipPath, { dir: destDir }),
      /Out of bound symlink target/
    );
    assert.strictEqual(fs.existsSync(path.join(destDir, 'escape')), false);
    assert.strictEqual(fs.readFileSync(secretPath, 'utf8'), 'UNCHANGED');
  });

  it('rejects a leak symlink whose target string walks through an in-tree directory link', async () => {
    const zipPath = path.join(tempRoot, 'leak-via-target.zip');
    const destDir = path.join(tempRoot, 'out');
    const secretPath = path.join(tempRoot, 'secret');
    fs.writeFileSync(secretPath, 'UNCHANGED');
    fs.writeFileSync(zipPath, createStoredZip([
      { name: 'inside/up', content: '..', unixMode: IFLNK },
      { name: 'leak', content: 'inside/up/../secret', unixMode: IFLNK }
    ]));

    await assert.rejects(
      () => installedExtractZip(zipPath, { dir: destDir }),
      /Out of bound symlink target/
    );
    assert.strictEqual(fs.existsSync(path.join(destDir, 'leak')), false);
    assert.strictEqual(fs.readFileSync(secretPath, 'utf8'), 'UNCHANGED');
  });

  it('rejects a dangling symlink target that later entries could turn into an escape', async () => {
    const zipPath = path.join(tempRoot, 'dangling-then-dir-link.zip');
    const destDir = path.join(tempRoot, 'out');
    const secretPath = path.join(tempRoot, 'secret');
    fs.writeFileSync(secretPath, 'UNCHANGED');
    fs.writeFileSync(zipPath, createStoredZip([
      { name: 'leak', content: 'inside/up/../secret', unixMode: IFLNK },
      { name: 'inside/up', content: '..', unixMode: IFLNK }
    ]));

    await assert.rejects(
      () => installedExtractZip(zipPath, { dir: destDir }),
      /Out of bound symlink target/
    );
    assert.strictEqual(fs.existsSync(path.join(destDir, 'leak')), false);
    assert.strictEqual(fs.readFileSync(secretPath, 'utf8'), 'UNCHANGED');
  });

  it('rejects a chained directory-link walk that would reach a host file', async () => {
    const zipPath = path.join(tempRoot, 'chain-leak.zip');
    const destDir = path.join(tempRoot, 'out');
    const hostSecret = path.join(tempRoot, 'host-secret');
    fs.writeFileSync(hostSecret, 'HOST-SECRET');
    fs.writeFileSync(zipPath, createStoredZip([
      { name: 'a/up', content: '..', unixMode: IFLNK },
      { name: 'a/up2', content: 'up/..', unixMode: IFLNK },
      { name: 'a/up3', content: 'up2/..', unixMode: IFLNK },
      { name: 'a/leak', content: 'up3/../../host-secret', unixMode: IFLNK }
    ]));

    await assert.rejects(
      () => installedExtractZip(zipPath, { dir: destDir }),
      /Out of bound symlink target/
    );
    assert.strictEqual(fs.existsSync(path.join(destDir, 'a/leak')), false);
    assert.strictEqual(fs.readFileSync(hostSecret, 'utf8'), 'HOST-SECRET');
  });

  it('does not mkdir outside the extract dir through an outbound directory link', async () => {
    const zipPath = path.join(tempRoot, 'mkdir-escape.zip');
    const destDir = path.join(tempRoot, 'out');
    const outsideDir = path.join(tempRoot, 'newdir');
    fs.writeFileSync(zipPath, createStoredZip([
      { name: 'inside/up', content: '..', unixMode: IFLNK },
      { name: 'outer', content: 'inside/up/../..', unixMode: IFLNK },
      { name: 'outer/newdir/pwned.txt', content: 'PWNED' }
    ]));

    await assert.rejects(
      () => installedExtractZip(zipPath, { dir: destDir }),
      /Out of bound/
    );
    assert.strictEqual(fs.existsSync(outsideDir), false);
    assert.strictEqual(fs.existsSync(path.join(destDir, 'outer/newdir/pwned.txt')), false);
  });

  it('refuses to write a regular file through a planted outside symlink', async () => {
    const zipPath = path.join(tempRoot, 'write-through.zip');
    const destDir = path.join(tempRoot, 'out');
    const secretPath = path.join(tempRoot, 'secret');
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(secretPath, 'UNCHANGED');
    fs.symlinkSync(path.relative(destDir, secretPath), path.join(destDir, 'escape'));
    fs.writeFileSync(zipPath, createStoredZip([
      { name: 'escape', content: 'PWNED' }
    ]));

    await assert.rejects(
      () => installedExtractZip(zipPath, { dir: destDir }),
      /Refusing to write through symlink|ELOOP/
    );
    assert.strictEqual(fs.readFileSync(secretPath, 'utf8'), 'UNCHANGED');
    assert.strictEqual(fs.readlinkSync(path.join(destDir, 'escape')), path.relative(destDir, secretPath));
  });

  it('extracts a regular file and an in-tree relative symlink', async () => {
    const zipPath = path.join(tempRoot, 'safe.zip');
    const destDir = path.join(tempRoot, 'out');
    fs.writeFileSync(zipPath, createStoredZip([
      { name: 'docs/readme.txt', content: 'hello' },
      { name: 'docs/alias.txt', content: 'readme.txt', unixMode: IFLNK }
    ]));

    await installedExtractZip(zipPath, { dir: destDir });

    assert.strictEqual(fs.readFileSync(path.join(destDir, 'docs/readme.txt'), 'utf8'), 'hello');
    assert.strictEqual(fs.readlinkSync(path.join(destDir, 'docs/alias.txt')), 'readme.txt');
    assert.strictEqual(fs.readFileSync(path.join(destDir, 'docs/alias.txt'), 'utf8'), 'hello');
  });

  it('keeps in-tree relative targets and rejects drive-escaping relatives', async () => {
    const extractDir = path.join(tempRoot, 'out');
    fs.mkdirSync(extractDir, { recursive: true });
    const destParent = path.join(extractDir, 'docs');
    await assert.doesNotReject(() =>
      assertSymlinkTargetWithinDir('../readme.txt', destParent, extractDir, 'docs/link')
    );
    await assert.rejects(
      () => assertSymlinkTargetWithinDir('../../outside', destParent, extractDir, 'docs/link'),
      /Out of bound symlink target/
    );
    await assert.rejects(
      () => assertSymlinkTargetWithinDir('ok\0../secret', destParent, extractDir, 'docs/link'),
      /Out of bound symlink target/
    );
  });
});
