import {pcreToRegexp} from './conversion';
import {relist} from './relist';

describe('testing relist', () => {
	test('\\1 string should result in first match', () => {
		expect(relist(['AAABBB', 'AAA', 'BBB'], '\\1')).toBe('AAA');
	});
	test('escaped characters should work', () => {
		expect(relist(['AAABBB', 'AAA'], '\\\\1\\1')).toBe('\\1AAA');
		expect(relist(['AAABBB', 'AAA'], '\\\\2\\1')).toBe('\\2AAA');
	});
	test('bad replacement should throw', () => {
		expect(() => {
			relist(['AAABBB', 'AAA', 'BBB'], '\\12');
		}).toThrow();
	});
	test('bad replacement should throw', () => {
		expect(() => {
			relist(['AAABBB', 'AAA', 'BBB'], '\\12');
		}).toThrow();
	});
});

describe('testing attemptRegexSyntax', () => {
	test('should not change ecmascript', () => {
		const expr = '(AL|EP|CP|WP)(\\d\\d)(200[5-9]|20[1-9]\\d)';
		expect(pcreToRegexp(expr)?.pattern).toBe(expr);
	});
	test('should convert PCRE2 to ECMASCRIPT', () => {
		expect(pcreToRegexp('[\\pL\\d\\-]+')?.pattern).toBe('[\\p{Letter}\\d\\-]+');
	});
	test('should detect \\d{1,4}+ as PCRE2', () => {
		expect(pcreToRegexp(String.raw`^(?:(?:(?:\+|00|011)[\./\-\ \t]*([17]|2(?:[07]|[1-689]\d)|3(?:[0-4679]|[578]\d)|4(?:[013-9]|2\d)|5(?:[1-8]|[09]\d)|6(?:[0-6]|[789]\d)|8(?:[1246]|[035789]\d)|9(?:[0-58]|[679]\d))[\./\-\ \t]*|([17])[\./\-\ ])?(?:\((\d{1,6})\)[\./\-\ \t]*)?(?:(\d{1,6})[\./\-\ ])?(?:(\d{1,6})[\./\-\ ])?(?:(\d{1,6})[\./\-\ ])?(?:(\d{1,6})[\./\-\ ])?(\d{0,10}?)(\d{1,4}+)(?:[\./\-;\ \t]*e?xt?[\./\-=\ \t]*(\d{1,14}))?)?$`)).toBeUndefined();
	});
	test('should fix unicode', () => {
		expect(pcreToRegexp('\\x{1234}\\xAa')?.pattern).toBe('\\u{1234}\\u{Aa}');
	});
	test('should fix unicode', () => {
		expect(pcreToRegexp('(?mis)xxx')?.pattern).toBe('xxx');
		expect(pcreToRegexp('(?mis)xxx')?.flags).toBe('mis');
	});
});

describe('testing \\p groups', () => {
	test('should support \\p{Ll}', () => {
		const lowercase = pcreToRegexp('\\p{Ll}');
		expect(lowercase?.flags).toBe('u');
		expect(lowercase?.pattern).toBe('\\p{Lowercase_Letter}');

		const re = new RegExp(lowercase.pattern, 'gu');
		// eslint-disable-next-line no-use-extend-native/no-use-extend-native
		expect('ЙйЦцУуQqWwEe!'.replaceAll(re, '')).toBe('ЙЦУQWE!');
	});
	test('should support \\p{Cyrillic}', () => {
		const cyrillic = pcreToRegexp('\\p{Cyrillic}');
		expect(cyrillic?.flags).toBe('u');
		expect(cyrillic?.pattern).toBe('\\p{Script=Cyrillic}');

		const re = new RegExp(cyrillic.pattern, 'gu');
		// eslint-disable-next-line no-use-extend-native/no-use-extend-native
		expect('ЙйЦцУуQqWwEe!'.replaceAll(re, '')).toBe('QqWwEe!');
	});
});
