/**
 * Unit tests for loadDiffWorkflowConfig() and resolveDiffWorkflowConfig() (T-20260401-007).
 *
 * Coverage:
 *   - CLI value overrides file value
 *   - ENV value overrides file value, loses to CLI value
 *   - file absent → default values used
 *   - each ENV mapping (TEXTUI_DIFF_MODE, TEXTUI_DIFF_AXIS,
 *     TEXTUI_DIFF_FEATURE_PR_COMMENT, TEXTUI_DIFF_FEATURE_CHECK_RUN_GATE)
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  loadDiffWorkflowConfig,
  resolveDiffWorkflowConfig,
} = require('../../out/workflow/diff/config/load-diff-workflow-config');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Write a temporary JSON file and return its path. Cleaned up after each test. */
function writeTempConfig(obj) {
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `diff-workflow-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(filePath, JSON.stringify(obj), 'utf8');
  return filePath;
}

/** Restore the original process.env values for the given keys. */
function withEnv(vars, fn) {
  const originals = {};
  for (const [k, v] of Object.entries(vars)) {
    originals[k] = process.env[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
  try {
    return fn();
  } finally {
    for (const [k, orig] of Object.entries(originals)) {
      if (orig === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = orig;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// loadDiffWorkflowConfig
// ---------------------------------------------------------------------------

describe('loadDiffWorkflowConfig (T-20260401-007)', () => {

  it('returns empty object when file does not exist', () => {
    const result = loadDiffWorkflowConfig('/tmp/non-existent-file-12345.json');
    assert.deepStrictEqual(result, {});
  });

  it('returns empty object when path is undefined and default file absent', () => {
    // The default path 'config/diff-workflow.json' may or may not exist;
    // the function must not throw.
    const result = loadDiffWorkflowConfig(undefined);
    assert.ok(typeof result === 'object' && result !== null);
  });

  it('reads and parses a valid JSON config file', () => {
    const configObj = {
      diffWorkflow: {
        enablementAxis: 'ci-only',
        mode: 'strict',
        features: { prComment: false, checkRunGate: true },
      },
    };
    const filePath = writeTempConfig(configObj);
    try {
      const result = loadDiffWorkflowConfig(filePath);
      assert.strictEqual(result.diffWorkflow.enablementAxis, 'ci-only');
      assert.strictEqual(result.diffWorkflow.mode, 'strict');
      assert.strictEqual(result.diffWorkflow.features.checkRunGate, true);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('returns empty object for invalid JSON', () => {
    const tmpPath = path.join(os.tmpdir(), `bad-json-${Date.now()}.json`);
    fs.writeFileSync(tmpPath, '{not valid json}', 'utf8');
    try {
      const result = loadDiffWorkflowConfig(tmpPath);
      assert.deepStrictEqual(result, {});
    } finally {
      fs.unlinkSync(tmpPath);
    }
  });
});

// ---------------------------------------------------------------------------
// resolveDiffWorkflowConfig — file absent → defaults
// ---------------------------------------------------------------------------

describe('resolveDiffWorkflowConfig — defaults (T-20260401-007)', () => {

  beforeEach(() => {
    // Clear all relevant ENV vars before each test.
    delete process.env.TEXTUI_DIFF_MODE;
    delete process.env.TEXTUI_DIFF_AXIS;
    delete process.env.TEXTUI_DIFF_FEATURE_PR_COMMENT;
    delete process.env.TEXTUI_DIFF_FEATURE_CHECK_RUN_GATE;
  });

  it('uses defaults when file absent and no overrides', () => {
    const result = resolveDiffWorkflowConfig({ configFilePath: '/tmp/absent-config-xyz.json' });
    assert.strictEqual(result.enablementAxis, 'local-only');
    assert.strictEqual(result.mode, 'advisory');
    assert.strictEqual(result.features.prComment, false);
    assert.strictEqual(result.features.checkRunGate, false);
  });

  it('returns all three keys in result', () => {
    const result = resolveDiffWorkflowConfig({ configFilePath: '/tmp/absent.json' });
    assert.ok('enablementAxis' in result);
    assert.ok('mode' in result);
    assert.ok('features' in result);
    assert.ok('prComment' in result.features);
    assert.ok('checkRunGate' in result.features);
  });
});

// ---------------------------------------------------------------------------
// resolveDiffWorkflowConfig — CLI overrides
// ---------------------------------------------------------------------------

describe('resolveDiffWorkflowConfig — CLI overrides (T-20260401-007)', () => {

  beforeEach(() => {
    delete process.env.TEXTUI_DIFF_MODE;
    delete process.env.TEXTUI_DIFF_AXIS;
    delete process.env.TEXTUI_DIFF_FEATURE_PR_COMMENT;
    delete process.env.TEXTUI_DIFF_FEATURE_CHECK_RUN_GATE;
  });

  it('CLI mode overrides file mode', () => {
    const filePath = writeTempConfig({ diffWorkflow: { mode: 'advisory' } });
    try {
      const result = resolveDiffWorkflowConfig({ mode: 'strict', configFilePath: filePath });
      assert.strictEqual(result.mode, 'strict');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('CLI enablementAxis overrides file enablementAxis', () => {
    const filePath = writeTempConfig({ diffWorkflow: { enablementAxis: 'local-only' } });
    try {
      const result = resolveDiffWorkflowConfig({ enablementAxis: 'pr-enabled', configFilePath: filePath });
      assert.strictEqual(result.enablementAxis, 'pr-enabled');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('CLI features.prComment overrides file features.prComment', () => {
    const filePath = writeTempConfig({ diffWorkflow: { features: { prComment: false } } });
    try {
      const result = resolveDiffWorkflowConfig({ features: { prComment: true }, configFilePath: filePath });
      assert.strictEqual(result.features.prComment, true);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('CLI features.checkRunGate overrides file features.checkRunGate', () => {
    const filePath = writeTempConfig({ diffWorkflow: { features: { checkRunGate: false } } });
    try {
      const result = resolveDiffWorkflowConfig({ features: { checkRunGate: true }, configFilePath: filePath });
      assert.strictEqual(result.features.checkRunGate, true);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('CLI override wins over ENV value', () => {
    withEnv({ TEXTUI_DIFF_MODE: 'strict' }, () => {
      const result = resolveDiffWorkflowConfig({ mode: 'advisory', configFilePath: '/tmp/absent.json' });
      assert.strictEqual(result.mode, 'advisory');
    });
  });
});

// ---------------------------------------------------------------------------
// resolveDiffWorkflowConfig — ENV overrides
// ---------------------------------------------------------------------------

describe('resolveDiffWorkflowConfig — ENV overrides (T-20260401-007)', () => {

  beforeEach(() => {
    delete process.env.TEXTUI_DIFF_MODE;
    delete process.env.TEXTUI_DIFF_AXIS;
    delete process.env.TEXTUI_DIFF_FEATURE_PR_COMMENT;
    delete process.env.TEXTUI_DIFF_FEATURE_CHECK_RUN_GATE;
  });

  it('TEXTUI_DIFF_MODE overrides file mode', () => {
    const filePath = writeTempConfig({ diffWorkflow: { mode: 'advisory' } });
    try {
      withEnv({ TEXTUI_DIFF_MODE: 'strict' }, () => {
        const result = resolveDiffWorkflowConfig({ configFilePath: filePath });
        assert.strictEqual(result.mode, 'strict');
      });
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('TEXTUI_DIFF_AXIS overrides file enablementAxis', () => {
    const filePath = writeTempConfig({ diffWorkflow: { enablementAxis: 'local-only' } });
    try {
      withEnv({ TEXTUI_DIFF_AXIS: 'ci-only' }, () => {
        const result = resolveDiffWorkflowConfig({ configFilePath: filePath });
        assert.strictEqual(result.enablementAxis, 'ci-only');
      });
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('TEXTUI_DIFF_FEATURE_PR_COMMENT=true overrides file default false', () => {
    withEnv({ TEXTUI_DIFF_FEATURE_PR_COMMENT: 'true' }, () => {
      const result = resolveDiffWorkflowConfig({ configFilePath: '/tmp/absent.json' });
      assert.strictEqual(result.features.prComment, true);
    });
  });

  it('TEXTUI_DIFF_FEATURE_PR_COMMENT=false overrides file true', () => {
    const filePath = writeTempConfig({ diffWorkflow: { features: { prComment: true } } });
    try {
      withEnv({ TEXTUI_DIFF_FEATURE_PR_COMMENT: 'false' }, () => {
        const result = resolveDiffWorkflowConfig({ configFilePath: filePath });
        assert.strictEqual(result.features.prComment, false);
      });
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('TEXTUI_DIFF_FEATURE_CHECK_RUN_GATE=1 enables checkRunGate', () => {
    withEnv({ TEXTUI_DIFF_FEATURE_CHECK_RUN_GATE: '1' }, () => {
      const result = resolveDiffWorkflowConfig({ configFilePath: '/tmp/absent.json' });
      assert.strictEqual(result.features.checkRunGate, true);
    });
  });

  it('TEXTUI_DIFF_FEATURE_CHECK_RUN_GATE=0 disables checkRunGate', () => {
    const filePath = writeTempConfig({ diffWorkflow: { features: { checkRunGate: true } } });
    try {
      withEnv({ TEXTUI_DIFF_FEATURE_CHECK_RUN_GATE: '0' }, () => {
        const result = resolveDiffWorkflowConfig({ configFilePath: filePath });
        assert.strictEqual(result.features.checkRunGate, false);
      });
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('ENV loses to CLI for mode', () => {
    withEnv({ TEXTUI_DIFF_MODE: 'strict' }, () => {
      const result = resolveDiffWorkflowConfig({ mode: 'advisory', configFilePath: '/tmp/absent.json' });
      assert.strictEqual(result.mode, 'advisory');
    });
  });

  it('ENV loses to CLI for enablementAxis', () => {
    withEnv({ TEXTUI_DIFF_AXIS: 'ci-only' }, () => {
      const result = resolveDiffWorkflowConfig({ enablementAxis: 'pr-enabled', configFilePath: '/tmp/absent.json' });
      assert.strictEqual(result.enablementAxis, 'pr-enabled');
    });
  });
});

// ---------------------------------------------------------------------------
// resolveDiffWorkflowConfig — file value wins over defaults
// ---------------------------------------------------------------------------

describe('resolveDiffWorkflowConfig — file overrides defaults (T-20260401-007)', () => {

  beforeEach(() => {
    delete process.env.TEXTUI_DIFF_MODE;
    delete process.env.TEXTUI_DIFF_AXIS;
    delete process.env.TEXTUI_DIFF_FEATURE_PR_COMMENT;
    delete process.env.TEXTUI_DIFF_FEATURE_CHECK_RUN_GATE;
  });

  it('file mode overrides default mode', () => {
    const filePath = writeTempConfig({ diffWorkflow: { mode: 'strict' } });
    try {
      const result = resolveDiffWorkflowConfig({ configFilePath: filePath });
      assert.strictEqual(result.mode, 'strict');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('file enablementAxis overrides default', () => {
    const filePath = writeTempConfig({ diffWorkflow: { enablementAxis: 'pr-enabled' } });
    try {
      const result = resolveDiffWorkflowConfig({ configFilePath: filePath });
      assert.strictEqual(result.enablementAxis, 'pr-enabled');
    } finally {
      fs.unlinkSync(filePath);
    }
  });
});
