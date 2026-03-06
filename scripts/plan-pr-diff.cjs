#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'out/cli/index.js');
const PLAN_PATH_GLOBS = ['*.tui.yml', '*.tui.yaml'];
const MAX_CHANGES_IN_SUMMARY = 50;

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      continue;
    }
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      parsed[key] = 'true';
      continue;
    }
    parsed[key] = value;
    i += 1;
  }
  return parsed;
}

function ensureDirectoryForFile(filePath) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

function runProcess(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8'
  });
}

function runGit(args) {
  return runProcess('git', args);
}

function runCli(args) {
  return runProcess(process.execPath, [cliPath, ...args]);
}

function ensureBaseRefExists(baseRef) {
  const check = runGit(['rev-parse', '--verify', baseRef]);
  if (check.status !== 0) {
    throw new Error(`base ref not found: ${baseRef}\n${check.stderr || check.stdout}`.trim());
  }
}

function resolveTargetsFromDiff(baseRef) {
  const diff = runGit([
    'diff',
    '--name-status',
    '--diff-filter=AMR',
    `${baseRef}...HEAD`,
    '--',
    ...PLAN_PATH_GLOBS
  ]);

  if (diff.status !== 0) {
    throw new Error(`git diff failed: ${diff.stderr || diff.stdout}`.trim());
  }

  const lines = diff.stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  return lines.map(line => {
    const fields = line.split('\t');
    const status = fields[0];
    if (status.startsWith('R')) {
      return {
        status: 'R',
        basePath: fields[1],
        currentPath: fields[2]
      };
    }
    return {
      status,
      basePath: status === 'A' ? null : fields[1],
      currentPath: fields[1]
    };
  });
}

function resolveTargetsFromFiles(files, baseRef) {
  return files.map(filePath => {
    const normalized = filePath.trim();
    if (!normalized) {
      return null;
    }
    const inBase = runGit(['cat-file', '-e', `${baseRef}:${normalized}`]);
    return {
      status: inBase.status === 0 ? 'M' : 'A',
      basePath: inBase.status === 0 ? normalized : null,
      currentPath: normalized
    };
  }).filter(Boolean);
}

function readBaseFile(baseRef, filePath) {
  const show = runGit(['show', `${baseRef}:${filePath}`]);
  if (show.status !== 0) {
    throw new Error(`failed to read base file '${filePath}': ${show.stderr || show.stdout}`.trim());
  }
  return show.stdout;
}

function getChangeCounts(changes) {
  return changes.reduce((acc, change) => {
    if (change.op === '+') {
      acc.add += 1;
    } else if (change.op === '~') {
      acc.update += 1;
    } else if (change.op === '-') {
      acc.remove += 1;
    }
    return acc;
  }, { add: 0, update: 0, remove: 0 });
}

function buildSummaryMarkdown(result) {
  const lines = [];
  lines.push('## TextUI DSL Plan サマリー');
  lines.push('');
  lines.push(`- 比較元: \`${result.baseRef}\``);
  lines.push(`- 対象ファイル数: ${result.totals.files}`);
  lines.push(`- 変更ありファイル数: ${result.totals.filesWithChanges}`);
  lines.push(`- 合計差分: +${result.totals.add} / ~${result.totals.update} / -${result.totals.remove}`);
  if (result.totals.errors > 0) {
    lines.push(`- エラー件数: ${result.totals.errors}`);
  }
  lines.push('');

  if (result.files.length === 0) {
    lines.push('変更された DSL ファイル（`*.tui.yml`, `*.tui.yaml`）はありません。');
    lines.push('');
    return lines.join('\n');
  }

  for (const fileResult of result.files) {
    lines.push(`### ${fileResult.currentPath}`);
    lines.push(`- ステータス: ${fileResult.status}`);
    lines.push(`- 比較元ファイル: ${fileResult.basePath || '(新規ファイル)'}`);

    if (fileResult.error) {
      lines.push(`- 判定: ❌ エラー`);
      lines.push(`- 詳細: ${fileResult.error}`);
      lines.push('');
      continue;
    }

    const mark = fileResult.hasChanges ? '⚠️ 変更あり' : '✅ 変更なし';
    lines.push(`- 判定: ${mark}`);
    lines.push(`- 差分: +${fileResult.counts.add} / ~${fileResult.counts.update} / -${fileResult.counts.remove}`);

    if (fileResult.changes.length > 0) {
      lines.push('- 変更内容:');
      const visibleChanges = fileResult.changes.slice(0, MAX_CHANGES_IN_SUMMARY);
      for (const change of visibleChanges) {
        const detail = change.details ? ` (${change.details})` : '';
        lines.push(`  - \`${change.op}\` ${change.type}[id=${change.id}] @ ${change.path}${detail}`);
      }
      if (fileResult.changes.length > MAX_CHANGES_IN_SUMMARY) {
        lines.push(`  - ... ${fileResult.changes.length - MAX_CHANGES_IN_SUMMARY} 件省略`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function writeIfRequested(targetPath, content) {
  if (!targetPath) {
    return;
  }
  ensureDirectoryForFile(targetPath);
  fs.writeFileSync(path.resolve(targetPath), content, 'utf8');
}

function rewriteStateEntry(statePath, currentPath) {
  if (!fs.existsSync(statePath)) {
    return;
  }
  const raw = fs.readFileSync(statePath, 'utf8');
  const state = JSON.parse(raw);
  if (!state || typeof state !== 'object' || !state.dsl || typeof state.dsl !== 'object') {
    return;
  }
  state.dsl.entry = currentPath;
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseRef = args['base-ref'] || (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : '');
  if (!baseRef) {
    throw new Error('base ref is required. pass --base-ref <ref> or set GITHUB_BASE_REF.');
  }

  ensureBaseRefExists(baseRef);

  const explicitFiles = args.files
    ? args.files.split(',').map(filePath => filePath.trim()).filter(Boolean)
    : null;

  const targets = explicitFiles
    ? resolveTargetsFromFiles(explicitFiles, baseRef)
    : resolveTargetsFromDiff(baseRef);

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-plan-'));
  const files = [];
  const totals = {
    files: targets.length,
    filesWithChanges: 0,
    add: 0,
    update: 0,
    remove: 0,
    errors: 0
  };

  try {
    targets.forEach((target, index) => {
      const currentAbsolute = path.resolve(repoRoot, target.currentPath);
      if (!fs.existsSync(currentAbsolute)) {
        files.push({
          ...target,
          error: `current file not found: ${target.currentPath}`
        });
        totals.errors += 1;
        return;
      }

      const statePath = path.join(workDir, `state-${index}.json`);
      try {
        if (target.basePath) {
          const baseContent = readBaseFile(baseRef, target.basePath);
          const baseDslPath = path.join(workDir, `base-${index}.tui.yml`);
          const outputPath = path.join(workDir, `base-${index}.html`);
          fs.writeFileSync(baseDslPath, baseContent, 'utf8');

          const apply = runCli([
            'apply',
            '--file', baseDslPath,
            '--provider', 'html',
            '--output', outputPath,
            '--state', statePath,
            '--auto-approve',
            '--json'
          ]);

          if (apply.status !== 0) {
            throw new Error((apply.stderr || apply.stdout || 'failed to build base state').trim());
          }

          // `plan` compares state entry path with the target DSL path.
          // The temporary base DSL path must be rewritten to the current DSL path.
          rewriteStateEntry(statePath, currentAbsolute);
        }

        const plan = runCli([
          'plan',
          '--file', currentAbsolute,
          '--state', statePath,
          '--json'
        ]);

        if (plan.status !== 0 && plan.status !== 3) {
          throw new Error((plan.stderr || plan.stdout || 'plan failed').trim());
        }

        const parsed = JSON.parse(plan.stdout || '{}');
        const changes = Array.isArray(parsed.changes) ? parsed.changes : [];
        const counts = getChangeCounts(changes);

        if (changes.length > 0) {
          totals.filesWithChanges += 1;
        }
        totals.add += counts.add;
        totals.update += counts.update;
        totals.remove += counts.remove;

        files.push({
          ...target,
          hasChanges: Boolean(parsed.hasChanges),
          changes,
          counts
        });
      } catch (error) {
        files.push({
          ...target,
          error: error instanceof Error ? error.message : String(error)
        });
        totals.errors += 1;
      }
    });
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }

  const result = {
    generatedAt: new Date().toISOString(),
    baseRef,
    totals,
    files
  };

  const summaryMarkdown = buildSummaryMarkdown(result);
  writeIfRequested(args['summary-file'], summaryMarkdown);
  writeIfRequested(args['json-file'], `${JSON.stringify(result, null, 2)}\n`);

  process.stdout.write(`${summaryMarkdown}\n`);
  if (totals.errors > 0) {
    process.exitCode = 1;
  }
}

main();
