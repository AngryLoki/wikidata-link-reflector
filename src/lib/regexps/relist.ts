export const relist = (matches: Array<string | undefined>, formatter: string) => {
	let out = '';
	for (let i = 0; i < formatter.length; i++) {
		if (formatter[i] === '\\') {
			const nextChar = formatter[i + 1];

			if (/\d/.test(nextChar)) {
				let sPosition = nextChar;
				i++;
				for (let j = i + 1; j < formatter.length; j++) {
					// eslint-disable-next-line max-depth
					if (!/\d/.test(formatter[j])) {
						i = j - 1;
						break;
					}

					sPosition += formatter[j];
				}

				const position = Number(sPosition);
				const match = matches[position];
				if (match !== undefined) {
					out += match;
				}
			} else if (nextChar === '\\') {
				out += nextChar;
				i++;
			} else {
				out += formatter[i];
			}
		} else {
			out += formatter[i];
		}
	}

	return out;
};
