export const fixUrlPattern = (pattern: string) => {
	pattern = pattern.replace(/^\^?https?\\?:/, '^https?:');

	const http = /^https\?\\?:\\?\/\\?\//;
	if (http.test(pattern)) {
		return `^${pattern}`;
	}

	return pattern;
};

export const validateUrlPattern = (property: string, pattern: string) => {
	const errors: string[] = [];

	if (!/^\^?http(?:s\??)?\\?:\\?\/\\?\/|^\(\^|\(\?:/.test(pattern)) {
		errors.push(`Unsupported prefix for expression: \`${pattern}\``);
	}

	const skipDotTest = ['P7590'];
	const strangeDot = /^\^https\?:\\?\/\\?\/[^/]+[^\\/]\./;
	if (strangeDot.test(pattern) && !skipDotTest.includes(property)) {
		errors.push(`Strange dot in expression: \`${pattern}\``);
	}

	const skipCapGroupTest = ['P1207'];
	if (/\(www./.test(pattern) && !skipCapGroupTest.includes(property)) {
		errors.push(`Strange capture group in expression: \`${pattern}\``);
	}

	if (/\bwd\b/.test(pattern)) {
		errors.push(`Straw "wd" sequence in expression: \`${pattern}\``);
	}

	const groups = (new RegExp(`${pattern}|`)).exec('')!.length - 1;
	if (groups === 0) {
		errors.push(`Pattern captures nothing: \`${pattern}\``);
	}

	return errors;
};

export const fixFullMatchPattern = (pattern: string) => pattern.replace(/^\^?(.+)\$?$/, '^(?:$1)$');

export const validateCapturingPattern = (pattern: string) => {
	const errors: string[] = [];

	const groups = (new RegExp(`${pattern}|`)).exec('')!.length - 1;
	if (groups === 0) {
		errors.push(`Pattern captures nothing: \`${pattern}\``);
	}

	return errors;
};

const reRegExpChar = /[\\/^$.*+?()[\]{}|]/g;

export const escapeRegExp = (value: string) => value.replace(reRegExpChar, '\\$&');
