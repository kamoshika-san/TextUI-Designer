const debug = require('debug')('extract-zip')
// eslint-disable-next-line node/no-unsupported-features/node-builtins
const { createWriteStream, constants: fsConstants, promises: fs } = require('fs')
const getStream = require('get-stream')
const path = require('path')
const { promisify } = require('util')
const stream = require('stream')
const yauzl = require('yauzl')

const openZip = promisify(yauzl.open)
const pipeline = promisify(stream.pipeline)

function isOutsideExtractDir (resolvedPath, extractDir) {
  const relativeTarget = path.relative(extractDir, resolvedPath)
  return path.isAbsolute(relativeTarget) || relativeTarget.split(path.sep).includes('..')
}

/**
 * CVE-2026-56876 / GHSA-jmr9-qjv8-65gv:
 * reject symlink targets that resolve outside the extraction directory.
 * `destParentReal` must already be fs.realpath() of the destination parent
 * so an intermediate in-tree directory symlink cannot hide an escape.
 */
function assertSymlinkTargetWithinDir (link, destParentReal, extractDir, fileName) {
  const rawLink = String(link)
  if (rawLink.includes('\0')) {
    throw new Error(`Out of bound symlink target "${link}" found while processing file ${fileName}`)
  }
  if (path.isAbsolute(rawLink)) {
    throw new Error(`Out of bound symlink target "${link}" found while processing file ${fileName}`)
  }

  const resolvedTarget = path.resolve(destParentReal, rawLink)
  if (isOutsideExtractDir(resolvedTarget, extractDir)) {
    throw new Error(`Out of bound symlink target "${link}" found while processing file ${fileName}`)
  }
  return rawLink
}

async function assertPathWithinExtractDir (resolvedPath, extractDir, fileName) {
  if (isOutsideExtractDir(resolvedPath, extractDir)) {
    throw new Error(`Out of bound path "${resolvedPath}" found while processing file ${fileName}`)
  }
}

async function createSafeWriteStream (dest, mode, extractDir, fileName) {
  let st
  try {
    st = await fs.lstat(dest)
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err
    }
  }
  if (st && st.isSymbolicLink()) {
    throw new Error(`Refusing to write through symlink "${dest}" found while processing file ${fileName}`)
  }

  const destParentReal = await fs.realpath(path.dirname(dest))
  await assertPathWithinExtractDir(destParentReal, extractDir, fileName)
  await assertPathWithinExtractDir(path.resolve(destParentReal, path.basename(dest)), extractDir, fileName)

  const flags = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_TRUNC | (fsConstants.O_NOFOLLOW || 0)
  return createWriteStream(dest, { mode, flags })
}

class Extractor {
  constructor (zipPath, opts) {
    this.zipPath = zipPath
    this.opts = opts
  }

  async extract () {
    debug('opening', this.zipPath, 'with opts', this.opts)

    this.zipfile = await openZip(this.zipPath, { lazyEntries: true })
    this.canceled = false

    return new Promise((resolve, reject) => {
      this.zipfile.on('error', err => {
        this.canceled = true
        reject(err)
      })
      this.zipfile.readEntry()

      this.zipfile.on('close', () => {
        if (!this.canceled) {
          debug('zip extraction complete')
          resolve()
        }
      })

      this.zipfile.on('entry', async entry => {
        /* istanbul ignore if */
        if (this.canceled) {
          debug('skipping entry', entry.fileName, { cancelled: this.canceled })
          return
        }

        debug('zipfile entry', entry.fileName)

        if (entry.fileName.startsWith('__MACOSX/')) {
          this.zipfile.readEntry()
          return
        }

        const destDir = path.dirname(path.join(this.opts.dir, entry.fileName))

        try {
          await fs.mkdir(destDir, { recursive: true })

          const canonicalDestDir = await fs.realpath(destDir)
          await assertPathWithinExtractDir(canonicalDestDir, this.opts.dir, entry.fileName)

          await this.extractEntry(entry)
          debug('finished processing', entry.fileName)
          this.zipfile.readEntry()
        } catch (err) {
          this.canceled = true
          this.zipfile.close()
          reject(err)
        }
      })
    })
  }

  async extractEntry (entry) {
    /* istanbul ignore if */
    if (this.canceled) {
      debug('skipping entry extraction', entry.fileName, { cancelled: this.canceled })
      return
    }

    if (this.opts.onEntry) {
      this.opts.onEntry(entry, this.zipfile)
    }

    const dest = path.join(this.opts.dir, entry.fileName)

    // convert external file attr int into a fs stat mode int
    const mode = (entry.externalFileAttributes >> 16) & 0xFFFF
    // check if it's a symlink or dir (using stat mode constants)
    const IFMT = 61440
    const IFDIR = 16384
    const IFLNK = 40960
    const symlink = (mode & IFMT) === IFLNK
    let isDir = (mode & IFMT) === IFDIR

    // Failsafe, borrowed from jsZip
    if (!isDir && entry.fileName.endsWith('/')) {
      isDir = true
    }

    // check for windows weird way of specifying a directory
    // https://github.com/maxogden/extract-zip/issues/13#issuecomment-154494566
    const madeBy = entry.versionMadeBy >> 8
    if (!isDir) isDir = (madeBy === 0 && entry.externalFileAttributes === 16)

    debug('extracting entry', { filename: entry.fileName, isDir: isDir, isSymlink: symlink })

    const procMode = this.getExtractedMode(mode, isDir) & 0o777

    // always ensure folders are created
    const destDir = isDir ? dest : path.dirname(dest)

    const mkdirOptions = { recursive: true }
    if (isDir) {
      mkdirOptions.mode = procMode
    }
    debug('mkdir', { dir: destDir, ...mkdirOptions })
    await fs.mkdir(destDir, mkdirOptions)
    if (isDir) return

    debug('opening read stream', dest)
    const readStream = await promisify(this.zipfile.openReadStream.bind(this.zipfile))(entry)
    const destParentReal = await fs.realpath(path.dirname(dest))
    await assertPathWithinExtractDir(destParentReal, this.opts.dir, entry.fileName)

    if (symlink) {
      const link = await getStream(readStream)
      debug('creating symlink', link, dest)
      const sanitizedLink = assertSymlinkTargetWithinDir(link, destParentReal, this.opts.dir, entry.fileName)
      await fs.symlink(sanitizedLink, dest)
    } else {
      await pipeline(readStream, await createSafeWriteStream(dest, procMode, this.opts.dir, entry.fileName))
    }
  }

  getExtractedMode (entryMode, isDir) {
    let mode = entryMode
    // Set defaults, if necessary
    if (mode === 0) {
      if (isDir) {
        if (this.opts.defaultDirMode) {
          mode = parseInt(this.opts.defaultDirMode, 10)
        }

        if (!mode) {
          mode = 0o755
        }
      } else {
        if (this.opts.defaultFileMode) {
          mode = parseInt(this.opts.defaultFileMode, 10)
        }

        if (!mode) {
          mode = 0o644
        }
      }
    }

    return mode
  }
}

module.exports = async function (zipPath, opts) {
  debug('creating target directory', opts.dir)

  if (!path.isAbsolute(opts.dir)) {
    throw new Error('Target directory is expected to be absolute')
  }

  await fs.mkdir(opts.dir, { recursive: true })
  opts.dir = await fs.realpath(opts.dir)
  return new Extractor(zipPath, opts).extract()
}

module.exports.assertSymlinkTargetWithinDir = assertSymlinkTargetWithinDir
