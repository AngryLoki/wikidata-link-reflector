export type RegexSyntax = 'ECMASCRIPT' | 'PCRE2';

/* eslint-disable @typescript-eslint/naming-convention */
const unicodeCategories: Record<string, string> = {
	L: 'Letter',
	Ll: 'Lowercase_Letter',
	Lu: 'Uppercase_Letter',
	Lt: 'Titlecase_Letter',
	'L&': 'Cased_Letter',
	Lm: 'Modifier_Letter',
	Lo: 'Other_Letter',
	M: 'Mark',
	Mn: 'Non_Spacing_Mark',
	Mc: 'Spacing_Combining_Mark',
	Me: 'Enclosing_Mark',
	Z: 'Separator',
	Zs: 'Space_Separator',
	Zl: 'Line_Separator',
	Zp: 'Paragraph_Separator',
	S: 'Symbol',
	Sm: 'Math_Symbol',
	Sc: 'Currency_Symbol',
	Sk: 'Modifier_Symbol',
	So: 'Other_Symbol',
	N: 'Number',
	Nd: 'Decimal_Digit_Number',
	Nl: 'Letter_Number',
	No: 'Other_Number',
	P: 'Punctuation',
	Pd: 'Dash_Punctuation',
	Ps: 'Open_Punctuation',
	Pe: 'Close_Punctuation',
	Pi: 'Initial_Punctuation',
	Pf: 'Final_Punctuation',
	Pc: 'Connector_Punctuation',
	Po: 'Other_Punctuation',
	C: 'Other',
	Cc: 'Control',
	Cf: 'Format',
	Co: 'Private_Use',
	Cs: 'Surrogate',
	Cn: 'Unassigned',

	Common: 'Script=Common',
	Arabic: 'Script=Arabic',
	Armenian: 'Script=Armenian',
	Bengali: 'Script=Bengali',
	Bopomofo: 'Script=Bopomofo',
	Braille: 'Script=Braille',
	Buhid: 'Script=Buhid',
	Canadian_Aboriginal: 'Script=Canadian_Aboriginal',
	Cherokee: 'Script=Cherokee',
	Cyrillic: 'Script=Cyrillic',
	Devanagari: 'Script=Devanagari',
	Ethiopic: 'Script=Ethiopic',
	Georgian: 'Script=Georgian',
	Greek: 'Script=Greek',
	Gujarati: 'Script=Gujarati',
	Gurmukhi: 'Script=Gurmukhi',
	Han: 'Script=Han',
	Hangul: 'Script=Hangul',
	Hanunoo: 'Script=Hanunoo',
	Hebrew: 'Script=Hebrew',
	Hiragana: 'Script=Hiragana',
	Inherited: 'Script=Inherited',
	Kannada: 'Script=Kannada',
	Katakana: 'Script=Katakana',
	Khmer: 'Script=Khmer',
	Lao: 'Script=Lao',
	Latin: 'Script=Latin',
	Limbu: 'Script=Limbu',
	Malayalam: 'Script=Malayalam',
	Mongolian: 'Script=Mongolian',
	Myanmar: 'Script=Myanmar',
	Ogham: 'Script=Ogham',
	Oriya: 'Script=Oriya',
	Runic: 'Script=Runic',
	Sinhala: 'Script=Sinhala',
	Syriac: 'Script=Syriac',
	Tagalog: 'Script=Tagalog',
	Tagbanwa: 'Script=Tagbanwa',
	TaiLe: 'Script=TaiLe',
	Tamil: 'Script=Tamil',
	Telugu: 'Script=Telugu',
	Thaana: 'Script=Thaana',
	Thai: 'Script=Thai',
	Tibetan: 'Script=Tibetan',
	Yi: 'Script=Yi',
};
/* eslint-enable @typescript-eslint/naming-convention */

export const guessRegexSyntax = (pattern: string): RegexSyntax => {
	if (/\?\+|\*\+|\+\+|{\d+(?:,\d*)?}\+/.test(pattern)) {
		return 'PCRE2';
	}

	const uniCatsRe = new RegExp(`\\\\[Pp][LMZSNPC]|\\\\[Pp]{(?!${Object.values(unicodeCategories).join('|')})`);
	if (uniCatsRe.test(pattern)) {
		return 'PCRE2';
	}

	if (/\\[XxAaZzGgEeCNRKhQo]|\\k[{']/.test(pattern)) {
		return 'PCRE2';
	}

	if (/\[:(\w+|<|>):]/.test(pattern)) {
		return 'PCRE2';
	}

	if (/\(\?[\w>#^\d\-+&|]/.test(pattern)) {
		return 'PCRE2';
	}

	if (/\(\?[mis]+\)/.test(pattern)) {
		return 'PCRE2';
	}

	return 'ECMASCRIPT';
};

export const pcreToRegexp = (pattern: string): {
	pattern: string;
	flags: string | undefined;
} | undefined => {
	const flags = new Set<string>();

	pattern = pattern.replace(/\\x{([\dA-Fa-f]{1,5})}|\\x([\dA-Fa-f]{2})/g, (_, group1: string, group2: string) => {
		flags.add('u');
		return `\\u{${group1 ?? group2}}`;
	});

	pattern = pattern.replace(/\\p{([A-Za-z_]+)}|\\p([A-Z])/g, (match, group1: string, group2: string) => {
		if (unicodeCategories[group1 ?? group2]) {
			flags.add('u');
			return `\\p{${unicodeCategories[group1 ?? group2]}}`;
		}

		return match;
	});

	pattern = pattern.replace(/^(\(\?[mis]+\))/, (_, group: string) => {
		const modifiers = group.slice(2, -1);
		for (const modifier of modifiers) {
			flags.add(modifier);
		}

		return '';
	});

	if (/(?<=^|\\\\|[^\\])\\X/.test(pattern)) {
		pattern = pattern.replace(/(?<=^|\\\\|[^\\])\\X/g, '(?:\\P{Mark}\\p{Mark}*)');
		flags.add('u');
	}

	if (guessRegexSyntax(pattern) !== 'ECMASCRIPT') {
		return;
	}

	return {pattern, flags: flags.size > 0 ? [...flags].join('') : undefined};
};
