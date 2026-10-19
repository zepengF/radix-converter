/*
 * RADIX conversion core
 * Supports bases 2–36, arbitrary-precision integers and fractional values.
 * Works in the browser (window.RadixConverter) and in Node (CommonJS).
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.RadixConverter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const MIN_BASE = 2;
  const MAX_BASE = 36;
  const MAX_INPUT_LENGTH = 512;
  const MAX_FRACTION_DIGITS = 128;

  function isValidBase(base) {
    return Number.isInteger(base) && base >= MIN_BASE && base <= MAX_BASE;
  }

  function digitValue(char) {
    if (char >= '0' && char <= '9') return char.charCodeAt(0) - 48;
    if (char >= 'A' && char <= 'Z') return char.charCodeAt(0) - 55;
    if (char >= 'a' && char <= 'z') return char.charCodeAt(0) - 87;
    return -1;
  }

  function failure(code, message) {
    return {
      ok: false,
      error: { code, message },
    };
  }

  /**
   * Parse a value in any base into an exact rational number.
   * Accepts signs, one decimal point, common digit separators and a matching
   * 0b / 0o / 0d / 0x prefix.
   */
  function parse(raw, base) {
    if (!isValidBase(base)) {
      return failure('BASE_RANGE', '进制必须在 2–36 之间。');
    }

    const original = raw == null ? '' : String(raw);
    const compact = original.replace(/[\s,_']/g, '');

    if (compact.length > MAX_INPUT_LENGTH) {
      return failure(
        'TOO_LONG',
        `输入过长，最多支持 ${MAX_INPUT_LENGTH} 个有效字符。`
      );
    }

    if (compact === '') {
      return failure('EMPTY', '请输入一个数值。');
    }

    let value = compact;
    let negative = false;

    if (value[0] === '-' || value[0] === '+') {
      negative = value[0] === '-';
      value = value.slice(1);
    }

    if (value === '') {
      return failure('EMPTY', '请输入一个数值。');
    }

    const prefixMap = { 2: '0b', 8: '0o', 10: '0d', 16: '0x' };
    const prefix = prefixMap[base];

    if (prefix && value.slice(0, 2).toLowerCase() === prefix) {
      value = value.slice(2);
    }

    if (value === '') {
      return failure('EMPTY', '请输入一个数值。');
    }

    if ((value.match(/\./g) || []).length > 1) {
      return failure('MULTIPLE_POINTS', '一个数值中只能包含一个小数点。');
    }

    const dot = value.indexOf('.');
    const integerRaw = dot === -1 ? value : value.slice(0, dot);
    const fractionRaw = dot === -1 ? '' : value.slice(dot + 1);

    if (integerRaw === '' && fractionRaw === '') {
      return failure('EMPTY', '请输入一个数值。');
    }

    const allDigits = integerRaw + fractionRaw;

    for (let i = 0; i < allDigits.length; i += 1) {
      const char = allDigits[i];
      const digit = digitValue(char);

      if (digit === -1) {
        return failure(
          'INVALID_CHAR',
          `无法识别字符 “${char}”，请检查输入。`
        );
      }

      if (digit >= base) {
        return failure(
          'DIGIT_RANGE',
          `数字 “${char}” 超出 ${base} 进制范围（最大 ${DIGITS[base - 1]}）。`
        );
      }
    }

    const bigBase = BigInt(base);
    let integerValue = 0n;

    for (let i = 0; i < integerRaw.length; i += 1) {
      integerValue = integerValue * bigBase + BigInt(digitValue(integerRaw[i]));
    }

    let fractionValue = 0n;
    let fractionDenominator = 1n;

    for (let i = 0; i < fractionRaw.length; i += 1) {
      fractionValue =
        fractionValue * bigBase + BigInt(digitValue(fractionRaw[i]));
      fractionDenominator *= bigBase;
    }

    const numerator = integerValue * fractionDenominator + fractionValue;
    const denominator = fractionDenominator;

    return {
      ok: true,
      base,
      numerator,
      denominator,
      negative: negative && numerator !== 0n,
      inputIntegerDigits: integerRaw.length,
      inputFractionDigits: fractionRaw.length,
      raw: original,
    };
  }

  function bigIntToBase(value, base) {
    if (value === 0n) return '0';

    const bigBase = BigInt(base);
    const output = [];
    let current = value;

    while (current > 0n) {
      output.push(DIGITS[Number(current % bigBase)]);
      current /= bigBase;
    }

    return output.reverse().join('');
  }

  /**
   * Convert a parsed rational number into a target base.
   * Fractions that do not terminate are cut at maxFractionDigits.
   */
  function toBase(parsed, base, maxFractionDigits) {
    if (!parsed || !parsed.ok) {
      throw new TypeError('toBase() expects a successfully parsed value.');
    }

    if (!isValidBase(base)) {
      throw new RangeError('Base must be an integer between 2 and 36.');
    }

    let precision = Number(maxFractionDigits);
    if (!Number.isFinite(precision)) precision = 16;
    precision = Math.max(0, Math.min(MAX_FRACTION_DIGITS, Math.floor(precision)));

    const bigBase = BigInt(base);
    const integerPart = parsed.numerator / parsed.denominator;
    let remainder = parsed.numerator % parsed.denominator;

    const integerDigits = bigIntToBase(integerPart, base);
    const fractionDigits = [];

    while (remainder !== 0n && fractionDigits.length < precision) {
      remainder *= bigBase;
      const digit = remainder / parsed.denominator;
      remainder %= parsed.denominator;
      fractionDigits.push(DIGITS[Number(digit)]);
    }

    const fractionPart = fractionDigits.join('');
    const truncated = remainder !== 0n;
    const magnitude =
      integerDigits + (fractionPart ? `.${fractionPart}` : '');

    return {
      base,
      digits: `${parsed.negative ? '-' : ''}${magnitude}`,
      magnitude,
      negative: parsed.negative,
      integerPart: integerDigits,
      fractionPart,
      truncated,
      exact: !truncated,
      precision,
    };
  }

  function groupFromRight(value, size) {
    const groups = [];

    for (let end = value.length; end > 0; end -= size) {
      groups.unshift(value.slice(Math.max(0, end - size), end));
    }

    return groups.join(' ');
  }

  function groupFromLeft(value, size) {
    const groups = [];

    for (let start = 0; start < value.length; start += size) {
      groups.push(value.slice(start, start + size));
    }

    return groups.join(' ');
  }

  /**
   * Add visual digit grouping without changing the underlying value.
   * Binary/hex use nibbles; octal and decimal use threes.
   */
  function groupDigits(value, base) {
    const text = String(value);

    if (!text) return text;

    let sign = '';
    let body = text;

    if (body[0] === '-' || body[0] === '+') {
      sign = body[0] === '-' ? '-' : '';
      body = body.slice(1);
    }

    const size = base === 2 || base === 16 ? 4 : base === 8 || base === 10 ? 3 : 4;
    const dot = body.indexOf('.');
    const integerPart = dot === -1 ? body : body.slice(0, dot);
    const fractionPart = dot === -1 ? null : body.slice(dot + 1);

    return (
      sign +
      groupFromRight(integerPart, size) +
      (fractionPart !== null ? `.${groupFromLeft(fractionPart, size)}` : '')
    );
  }

  return {
    DIGITS,
    MIN_BASE,
    MAX_BASE,
    MAX_INPUT_LENGTH,
    MAX_FRACTION_DIGITS,
    isValidBase,
    digitValue,
    parse,
    toBase,
    groupDigits,
  };
});
