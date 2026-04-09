const assert = require('assert');
const path = require('path');
const Module = require('module');

describe('handleApplyCommand', () => {
  const applyCommandPath = path.resolve(__dirname, '../../out/cli/commands/apply-command.js');
  let originalStdoutWrite;
  let originalStderrWrite;
  let stdoutBuffer;
  let stderrBuffer;

  function installOutputCapture() {
    stdoutBuffer = '';
    stderrBuffer = '';
    originalStdoutWrite = process.stdout.write;
    originalStderrWrite = process.stderr.write;
    process.stdout.write = (chunk, ...args) => {
      stdoutBuffer += String(chunk);
      return typeof originalStdoutWrite === 'function' ? true : undefined;
    };
    process.stderr.write = (chunk, ...args) => {
      stderrBuffer += String(chunk);
      return typeof originalStderrWrite === 'function' ? true : undefined;
    };
  }

  function restoreOutputCapture() {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }

  function createModuleOverrides(options = {}) {
    const args = options.args || {};
    const flags = options.flags || {};
    const state = options.state === undefined ? { resources: [] } : options.state;
    const loaded = options.loaded || { dsl: { page: { id: 'sample' } }, sourcePath: '/workspace/sample.tui.yml' };
    const validation = options.validation || { valid: true };
    const previewPlan = options.previewPlan || { hasChanges: true };
    const applyExecution = options.applyExecution || { applied: true, conflict: false, changes: 3, tokenWarnings: 0 };
    const supportedProviders = options.supportedProviders || ['html', 'react'];
    const providerExtension = options.providerExtension || '.html';
    const providerVersion = options.providerVersion || '1.2.3';
    const themePath = options.themePath === undefined ? '/workspace/theme.yml' : options.themePath;
    const tokenOnError = options.tokenOnError || 'error';
    const stateFingerprint = options.stateFingerprint || 'fingerprint-1';
    const applyAcrossFilesResult = options.applyAcrossFilesResult || 0;
    const spies = {
      applyAcrossFilesCalls: [],
      applyForFileCalls: [],
      printJsonCalls: []
    };

    const overrides = {
      '../planner': {
        buildPlan: () => previewPlan
      },
      '../state-manager': {
        DEFAULT_STATE_PATH: '/workspace/default.state.json',
        loadState: () => state
      },
      '../io': {
        resolveDslFiles: () => options.filePaths || ['/workspace/a.tui.yml', '/workspace/b.tui.yml'],
        resolveDslFile: () => options.resolvedFilePath || '/workspace/sample.tui.yml',
        loadDslFromFile: () => loaded
      },
      '../validator': {
        validateDsl: () => validation
      },
      '../exporter-runner': {
        isSupportedProvider: async () => options.isSupportedProvider !== undefined ? options.isSupportedProvider : true,
        getSupportedProviderNames: async () => supportedProviders,
        getSuggestedProviderNames: async () => supportedProviders,
        getProviderExtension: async () => providerExtension,
        getProviderVersion: async () => providerVersion
      },
      '../command-support': {
        getArg: (name) => args[name],
        getStateFingerprint: () => stateFingerprint,
        parseThemePath: () => themePath,
        hasFlag: (name) => Boolean(flags[name]),
        parseTokenErrorMode: () => tokenOnError,
        applyAcrossFiles: (payload) => {
          spies.applyAcrossFilesCalls.push(payload);
          return applyAcrossFilesResult;
        },
        applyForFile: async (payload) => {
          spies.applyForFileCalls.push(payload);
          return applyExecution;
        },
        printJson: (payload) => {
          spies.printJsonCalls.push(payload);
        }
      }
    };

    return { overrides, spies };
  }

  function loadHandleApplyCommand(overrides) {
    const originalRequire = Module.prototype.require;
    delete require.cache[applyCommandPath];
    Module.prototype.require = function(id) {
      if (Object.prototype.hasOwnProperty.call(overrides, id)) {
        return overrides[id];
      }
      return originalRequire.apply(this, arguments);
    };

    try {
      return require(applyCommandPath).handleApplyCommand;
    } finally {
      Module.prototype.require = originalRequire;
    }
  }

  beforeEach(() => {
    installOutputCapture();
  });

  afterEach(() => {
    restoreOutputCapture();
    delete require.cache[applyCommandPath];
  });

  it('returns 1 and prints supported providers when provider is unsupported', async () => {
    const { overrides } = createModuleOverrides({
      args: { '--provider': 'solid' },
      isSupportedProvider: false,
      supportedProviders: ['html', 'pug', 'react']
    });
    const handleApplyCommand = loadHandleApplyCommand(overrides);

    const exitCode = await handleApplyCommand({ fileArg: 'sample.tui.yml' });

    assert.strictEqual(exitCode, 1);
    assert.match(stderrBuffer, /unsupported provider: solid/);
    assert.match(stderrBuffer, /supported providers: html, pug, react/);
  });

  it('delegates directory mode to applyAcrossFiles with derived options', async () => {
    const { overrides, spies } = createModuleOverrides({
      args: {
        '--provider': 'react',
        '--provider-module': '/workspace/provider.cjs',
        '--output': '/workspace/out',
        '--state': '/workspace/state',
      },
      flags: {
        '--deterministic': true,
        '--auto-approve': true,
        '--json': true
      },
      tokenOnError: 'warn',
      themePath: '/workspace/theme.yml',
      filePaths: ['/workspace/nested/a.tui.yml'],
      applyAcrossFilesResult: 7
    });
    const handleApplyCommand = loadHandleApplyCommand(overrides);

    const exitCode = await handleApplyCommand({ fileArg: 'nested/a.tui.yml', dirArg: '/workspace/root' });

    assert.strictEqual(exitCode, 7);
    assert.strictEqual(spies.applyAcrossFilesCalls.length, 1);
    assert.deepStrictEqual(spies.applyAcrossFilesCalls[0], {
      filePaths: ['/workspace/nested/a.tui.yml'],
      rootDir: path.resolve('/workspace/root'),
      provider: 'react',
      providerModulePath: '/workspace/provider.cjs',
      themePath: '/workspace/theme.yml',
      deterministic: true,
      tokenOnError: 'warn',
      autoApprove: true,
      outputArg: '/workspace/out',
      stateArg: '/workspace/state',
      json: true
    });
  });

  it('returns 2 when DSL validation fails', async () => {
    const { overrides, spies } = createModuleOverrides({
      validation: { valid: false }
    });
    const handleApplyCommand = loadHandleApplyCommand(overrides);

    const exitCode = await handleApplyCommand({ fileArg: 'sample.tui.yml' });

    assert.strictEqual(exitCode, 2);
    assert.strictEqual(spies.applyForFileCalls.length, 0);
  });

  it('returns 0 and prints skip message when preview plan has no changes', async () => {
    const { overrides, spies } = createModuleOverrides({
      previewPlan: { hasChanges: false }
    });
    const handleApplyCommand = loadHandleApplyCommand(overrides);

    const exitCode = await handleApplyCommand({ fileArg: 'sample.tui.yml' });

    assert.strictEqual(exitCode, 0);
    assert.match(stdoutBuffer, /No changes\. apply skipped\./);
    assert.strictEqual(spies.applyForFileCalls.length, 0);
  });

  it('returns 1 when auto-approve is missing for changed plans', async () => {
    const { overrides, spies } = createModuleOverrides({
      flags: {}
    });
    const handleApplyCommand = loadHandleApplyCommand(overrides);

    const exitCode = await handleApplyCommand({ fileArg: 'sample.tui.yml' });

    assert.strictEqual(exitCode, 1);
    assert.match(stderrBuffer, /apply requires --auto-approve/);
    assert.strictEqual(spies.applyForFileCalls.length, 0);
  });

  it('returns 4 when applyForFile reports a state conflict', async () => {
    const { overrides, spies } = createModuleOverrides({
      flags: { '--auto-approve': true },
      applyExecution: { applied: true, conflict: true, changes: 2, tokenWarnings: 0 }
    });
    const handleApplyCommand = loadHandleApplyCommand(overrides);

    const exitCode = await handleApplyCommand({ fileArg: 'sample.tui.yml' });

    assert.strictEqual(exitCode, 4);
    assert.strictEqual(spies.applyForFileCalls.length, 1);
    assert.match(stderrBuffer, /state conflict detected/);
  });

  it('emits JSON summary for successful apply executions', async () => {
    const { overrides, spies } = createModuleOverrides({
      args: {
        '--state': '/workspace/custom.state.json',
        '--output': '/workspace/custom-output.html',
        '--provider': 'html'
      },
      flags: {
        '--auto-approve': true,
        '--deterministic': true,
        '--json': true
      },
      themePath: '/workspace/custom-theme.yml',
      tokenOnError: 'warn',
      applyExecution: { applied: true, conflict: false, changes: 5, tokenWarnings: 2 }
    });
    const handleApplyCommand = loadHandleApplyCommand(overrides);

    const exitCode = await handleApplyCommand({ fileArg: 'sample.tui.yml' });

    assert.strictEqual(exitCode, 0);
    assert.strictEqual(spies.applyForFileCalls.length, 1);
    assert.deepStrictEqual(spies.printJsonCalls[0], {
      applied: true,
      output: path.resolve('/workspace/custom-output.html'),
      state: path.resolve('/workspace/custom.state.json'),
      changes: 5,
      deterministic: true,
      themePath: '/workspace/custom-theme.yml',
      tokenOnError: 'warn',
      tokenWarnings: 2
    });
  });
});
