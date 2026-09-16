import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryTokenBucket } from '../src/tokenBucket.js';

describe('Token Bucket Pacing Mechanics', () => {
  it('should grant tokens up to rate limit', async () => {
    const bucket = new InMemoryTokenBucket();
    const ratePerSec = 50;

    // First request: 30 tokens out of 50 capacity
    const granted1 = await bucket.takeTokens('gw-1', 30, ratePerSec);
    assert.equal(granted1, 30);

    // Second request: 20 tokens (remaining in capacity)
    const granted2 = await bucket.takeTokens('gw-1', 20, ratePerSec);
    assert.equal(granted2, 20);

    // Third request: 10 tokens (bucket now exhausted)
    const granted3 = await bucket.takeTokens('gw-1', 10, ratePerSec);
    assert.equal(granted3, 0);
  });

  it('should refill tokens after time passes', async () => {
    const bucket = new InMemoryTokenBucket();
    const ratePerSec = 100;

    // Drain all tokens
    await bucket.takeTokens('gw-2', 100, ratePerSec);

    // Wait 150ms -> should refill ~15 tokens
    await new Promise((res) => setTimeout(res, 150));

    const granted = await bucket.takeTokens('gw-2', 10, ratePerSec);
    assert.ok(granted >= 10, 'Tokens should have refilled');
  });
});
