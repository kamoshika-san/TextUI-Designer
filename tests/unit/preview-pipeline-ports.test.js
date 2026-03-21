const { strict: assert } = require('assert');
const sinon = require('sinon');

describe('preview pipeline ports (T-106)', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('lookupPreviewCacheData: forceUpdate なら常に null', () => {
    const { lookupPreviewCacheData } = require('../../out/services/webview/preview-cache-port');
    const fake = { getCachedData: sinon.stub().returns({ ok: true }) };
    const r = lookupPreviewCacheData(fake, 'a.yml', 'x', true);
    assert.equal(r, null);
    assert.ok(fake.getCachedData.notCalled);
  });

  it('lookupPreviewCacheData: forceUpdate でなければ cache を参照', () => {
    const { lookupPreviewCacheData } = require('../../out/services/webview/preview-cache-port');
    const fake = { getCachedData: sinon.stub().returns('hit') };
    const r = lookupPreviewCacheData(fake, 'a.yml', 'x', false);
    assert.equal(r, 'hit');
    sinon.assert.calledOnceWithExactly(fake.getCachedData, 'a.yml', 'x');
  });

  it('parseValidateYamlForPreview: YamlParser.parseYamlFile を委譲', async () => {
    const { parseValidateYamlForPreview } = require('../../out/services/webview/preview-parser-validator-port');
    const parser = { parseYamlFile: sinon.stub().resolves({ data: 1, fileName: 'f', content: 'c' }) };
    const out = await parseValidateYamlForPreview(parser, 'path');
    assert.deepEqual(out, { data: 1, fileName: 'f', content: 'c' });
    sinon.assert.calledOnceWithExactly(parser.parseYamlFile, 'path');
  });

  it('applyPreviewFailurePolicy: YamlParseError で sendParseError', () => {
    const { applyPreviewFailurePolicy } = require('../../out/services/webview/preview-failure-policy');
    const err = new Error('p');
    err.name = 'YamlParseError';
    const errorHandler = {
      sendParseError: sinon.stub(),
      sendSchemaError: sinon.stub(),
      sendFileSizeError: sinon.stub()
    };
    applyPreviewFailurePolicy(err, { errorHandler, lastTuiFile: '/x.tui.yml' });
    sinon.assert.calledOnceWithExactly(errorHandler.sendParseError, err, '/x.tui.yml', '');
    sinon.assert.notCalled(errorHandler.sendSchemaError);
  });

  it('applyPreviewFailurePolicy: 未知エラーで ErrorHandler.showError', () => {
    const eh = require('../../out/utils/error-handler');
    const showStub = sinon.stub(eh.ErrorHandler, 'showError');
    const { applyPreviewFailurePolicy } = require('../../out/services/webview/preview-failure-policy');
    const errorHandler = {
      sendParseError: sinon.stub(),
      sendSchemaError: sinon.stub(),
      sendFileSizeError: sinon.stub()
    };
    try {
      const err = new Error('boom');
      applyPreviewFailurePolicy(err, { errorHandler, lastTuiFile: '' });
      sinon.assert.calledOnce(showStub);
      sinon.assert.notCalled(errorHandler.sendParseError);
    } finally {
      showStub.restore();
    }
  });
});
