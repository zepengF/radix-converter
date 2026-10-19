const test = require('node:test');
const assert = require('node:assert/strict');

const Radix = require('../converter.js');

function convert(raw, sourceBase, targetBase, precision = 16) {
  const parsed = Radix.parse(raw, sourceBase);
  assert.equal(parsed.ok, true, parsed.error && parsed.error.message);
  return Radix.toBase(parsed, targetBase, precision);
}

test('converts binary fractions to decimal', () => {
  assert.equal(convert('1011.01', 2, 10).digits, '11.25');
});

test('converts hex fractions to decimal', () => {
  assert.equal(convert('FF.A', 16, 10).digits, '255.625');
});

test('supports 64-bit BigInt values', () => {
  const result = convert('FFFFFFFFFFFFFFFF', 16, 10);
  assert.equal(result.digits, '18446744073709551615');
  assert.equal(result.truncated, false);
});

test('round-trips the maximum-length integer input', () => {
  const raw = '9'.repeat(Radix.MAX_INPUT_LENGTH);
  const parsed = Radix.parse(raw, 10);
  assert.equal(parsed.ok, true);
  assert.equal(Radix.toBase(parsed, 10).digits, raw);
});

test('supports every base up to 36', () => {
  assert.equal(convert('Z', 36, 10).digits, '35');
  assert.equal(convert('100', 3, 10).digits, '9');
});

test('handles signs, prefixes and digit separators', () => {
  assert.equal(convert('-101.1', 2, 10).digits, '-5.5');
  assert.equal(convert('0b1010_1010', 2, 10).digits, '170');
  assert.equal(convert(' 0xFF_FF ', 16, 10).digits, '65535');
  assert.equal(convert('1,234', 10, 10).digits, '1234');
});

test('truncates repeating fractions and flags them', () => {
  const result = convert('0.1', 10, 2, 8);
  assert.equal(result.digits, '0.00011001');
  assert.equal(result.truncated, true);
  assert.equal(result.exact, false);
});

test('keeps terminating fractions exact', () => {
  const result = convert('0.5', 10, 2);
  assert.equal(result.digits, '0.1');
  assert.equal(result.truncated, false);
});

test('normalizes negative zero', () => {
  const parsed = Radix.parse('-0', 10);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.negative, false);
  assert.equal(Radix.toBase(parsed, 2).digits, '0');
});

test('groups digits for display only', () => {
  assert.equal(Radix.groupDigits('10110101.101', 2), '1011 0101.101');
  assert.equal(Radix.groupDigits('1234567.89', 10), '1 234 567.89');
  assert.equal(Radix.groupDigits('-FFA.1', 16), '-FFA.1');
});

test('reports invalid digits and characters', () => {
  const tooBig = Radix.parse('102', 2);
  assert.equal(tooBig.ok, false);
  assert.equal(tooBig.error.code, 'DIGIT_RANGE');

  const badChar = Radix.parse('12$', 10);
  assert.equal(badChar.ok, false);
  assert.equal(badChar.error.code, 'INVALID_CHAR');

  const twoDots = Radix.parse('1.2.3', 10);
  assert.equal(twoDots.ok, false);
  assert.equal(twoDots.error.code, 'MULTIPLE_POINTS');
});

test('treats partial input as empty rather than invalid', () => {
  for (const value of ['', '-', '+', '.', '0x', '0b']) {
    const parsed = Radix.parse(value, value === '0x' ? 16 : 2);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.error.code, 'EMPTY');
  }
});

test('enforces base and length limits', () => {
  assert.equal(Radix.parse('1', 1).error.code, 'BASE_RANGE');
  assert.equal(Radix.parse('1', 37).error.code, 'BASE_RANGE');
  assert.equal(
    Radix.parse('1'.repeat(Radix.MAX_INPUT_LENGTH + 1), 2).error.code,
    'TOO_LONG'
  );
  assert.throws(() => Radix.toBase({ ok: true }, 10), TypeError);
});

test('supports precision zero for integer output', () => {
  const result = convert('1.5', 10, 2, 0);
  assert.equal(result.digits, '1');
  assert.equal(result.truncated, true);
});
