import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateHighlightSign, verifyHighlightSign } from '../src/signer.js';

describe('Highlight MD5 Signer & Wire Protocol', () => {
  const appKey = '21186651';
  const appSecret = '67c08468b185468ea5326fe26def69ef';

  it('should generate and verify valid MD5 signature according to §4 spec', () => {
    const timestamp = 1606358315000;
    const method = 'createOrganization';
    const sign = generateHighlightSign(appKey, appSecret, timestamp, method);
    assert.ok(sign);
    assert.equal(verifyHighlightSign(sign, appKey, appSecret, timestamp, method), true);
  });
});
