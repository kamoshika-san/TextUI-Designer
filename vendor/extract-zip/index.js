const debug = require('debug')('extract-zip')
// eslint-disable-next-line node/no-unsupported-features/node-builtins
const { createWriteStream, constants: fsConstants, promises: fs, realpath: realpathCb } = require('fs')
const getStream = require('get-stream')
const path = require('path')
const { promisify } = require('util')
const stream = require('stream')
const yauzl = require('yauzl')

const openZip = promisify(yauzl.open)
const pipeline = promisify(stream.pipeline)
const realpathNative = promisify(realpathCb.native)

const MAX_SYMLINK_DEPTH = 40

function isOutsideExtractDir (resolvedPath, extractDir) {
  const relativeTarget = path.relative(extractDir, resolvedPath)
  return path.isAbsolute(relativeTarget) || relativeTarget.split(path.sep).includes('..')
}

function outOfBoundTargetError (link, fileName) {
  return new Error(`Out of bound symlink target "${link}" found while processing file ${fileName}`)
}

/**
 * Resolve `relPath` from `startReal` the way the kernel does: follow existing
 * symlinks component-by-component. `path.resolve` is not enough because it
 * cancels `up/..` lexically even when `up` is a symlink to `..`.
 */
async function walkPathWithinExtractDir (startReal, relPath, extractDir, fileName, depth) {
  if (depth > MAX_SYMLINK_DEPTH) {
    throw outOfBoundTargetError(relPath, fileName)
  }

  let current = startReal
  const parts = String(relPath).split(/[\\/]/)

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part === '' || part === '.') {
      continue
    }
    if (part === '..') {
      const parent = path.dirname(current)
      if (parent === current || isOutsideExtractDir(parent, extractDir)) {
        throw outOfBoundTargetError(relPath, fileName)
      }
      current = parent
      continue
    }

    const candidate = path.join(current, part)
    if (isOutsideExtractDir(candidate, extractDir)) {
      throw outOfBoundTargetError(relPath, fileName)
    }

    let st
    try {
      st = await fs.lstat(candidate)
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err
      }
      let lex = current
      for (const rest of parts.slice(i)) {
        if (rest === '' || rest === '.') {
          continue
        }
        if (rest === '..') {
          lex = path.dirname(lex)
        } else {
          lex = path.join(lex, rest)
        }
        if (isOutsideExtractDir(lex, extractDir)) {
          throw outOfBoundTargetError(relPath, fileName)
        }
      }
      return lex
    }

    if (st.isSymbolicLink()) {
      const target = await fs.readlink(candidate)
      if (String(target).includes('\0') || path.isAbsolute(target)) {
        throw outOfBoundTargetError(target, fileName)
      }
      current = await walkPathWithinExtractDir(
        path.dirname(candidate),
        target,
        extractDir,
        fileName,
        depth + 1
      )
      continue
    }

    current = candidate
    if (isOutsideExtractDir(current, extractDir)) {
      throw outOfBoundTargetError(relPath, fileName)
    }
  }

  return current
}

/**
 * CVE-2026-56876 / GHSA-jmr9-qjv8-65gv:
 * reject symlink targets that resolve outside the extraction directory.
 * Walks existing intermediate symlinks instead of using lexical path.resolve.
 */
async function assertSymlinkTargetWithinDir (link, destParentReal, extractDir, fileName) {
  const rawLink = String(link)
  if (rawLink.includes('\0') || path.isAbsolute(rawLink)) {
    throw outOfBoundTargetError(link, fileName)
  }
  await walkPathWithinExtractDir(destParentReal, rawLink, extractDir, fileName, 0)
  return rawLink
}

async function assertPathWithinExtractDir (resolvedPath, extractDir, fileName) {
  if (isOutsideExtractDir(resolvedPath, extractDir)) {
    throw new Error(`Out of bound path "${resolvedPath}" found while processing file ${fileName}`)
  }
}

async function assertCreatedSymlinkStaysInside (dest, extractDir, fileName) {
  let real
  try {
    real = await realpathNative(dest)
  } catch (err) {
    if (err.code === 'ENOENT') {
      return
    }
    throw err
  }
  if (isOutsideExtractDir(real, extractDir)) {
    await fs.unlink(dest)
    throw new Error(`Out of bound symlink target "${real}" found while processing file ${fileName}`)
  }
}

async function ensureDirWithinExtractDir (destDir, extractDir, options, fileName) {
  const destAbs = path.resolve(destDir)
  const rel = path.relative(extractDir, destAbs)
  if (rel === '') {
    return extractDir
  }
  if (path.isAbsolute(rel) || rel.split(path.sep).includes('..')) {
    throw new Error(`Out of bound path "${destAbs}" found while processing file ${fileName}`)
  }

  let current = extractDir
  const parts = rel.split(path.sep).filter(Boolean)
  for (let i = 0; i < parts.length; i++) {
    const next = path.join(current, parts[i])
    let st
    try {
      st = await fs.lstat(next)
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err
      }
      const toCreate = path.join(current, ...parts.slice(i))
      await fs.mkdir(toCreate, { recursive: true, ...(options || {}) })
      const createdReal = await realpathNative(toCreate)
      await assertPathWithinExtractDir(createdReal, extractDir, fileName)
      return createdReal
    }

    if (st.isSymbolicLink()) {
      let real
      try {
        real = await realpathNative(next)
      } catch (err) {
        throw new Error(`Out of bound path "${next}" found while processing file ${fileName}`)
      }
      await assertPathWithinExtractDir(real, extractDir, fileName)
      current = real
      continue
    }

    if (!st.isDirectory()) {
      throw new Error(`Out of bound path "${next}" found while processing file ${fileName}`)
    }
    current = next
  }
  return current
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

  const destParentReal = await realpathNative(path.dirname(dest))
  await assertPathWithinExtractDir(destParentReal, extractDir, fileName)
  await assertPathWithinExtractDir(path.resolve(destParentReal, path.basename(dest)), extractDir, fileName)

  const nofollow = fsConstants.O_NOFOLLOW
  const flags = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_TRUNC | (nofollow || 0)
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
          await ensureDirWithinExtractDir(destDir, this.opts.dir, { recursive: true }, entry.fileName)
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
    await ensureDirWithinExtractDir(destDir, this.opts.dir, mkdirOptions, entry.fileName)
    if (isDir) return

    debug('opening read stream', dest)
    const readStream = await promisify(this.zipfile.openReadStream.bind(this.zipfile))(entry)
    const destParentReal = await realpathNative(path.dirname(dest))
    await assertPathWithinExtractDir(destParentReal, this.opts.dir, entry.fileName)

    if (symlink) {
      const link = await getStream(readStream)
      debug('creating symlink', link, dest)
      const sanitizedLink = await assertSymlinkTargetWithinDir(link, destParentReal, this.opts.dir, entry.fileName)
      await fs.symlink(sanitizedLink, dest)
      await assertCreatedSymlinkStaysInside(dest, this.opts.dir, entry.fileName)
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
  opts.dir = await realpathNative(opts.dir)
  return new Extractor(zipPath, opts).extract()
}

module.exports.assertSymlinkTargetWithinDir = assertSymlinkTargetWithinDir
