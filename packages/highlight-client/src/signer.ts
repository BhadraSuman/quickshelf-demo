import crypto from 'node:crypto';

/**
 * Generate Highlight ESL MD5 signature per specification (V5.0.17):
 * sign = MD5(appKey + appSecret + timestamp + methodName).toUpperCase()
 */
export function generateHighlightSign(
  appKey: string,
  appSecret: string,
  timestamp: number | string,
  methodName: string
): string {
  const query = `${appKey}${appSecret}${timestamp}${methodName}`;
  return crypto.createHash('md5').update(query, 'utf8').digest('hex').toUpperCase();
}

/**
 * Verify an incoming signature against known appKey and appSecret.
 */
export function verifyHighlightSign(
  sign: string,
  appKey: string,
  appSecret: string,
  timestamp: number | string,
  methodName: string
): boolean {
  const expected = generateHighlightSign(appKey, appSecret, timestamp, methodName);
  return sign.toUpperCase() === expected;
}
