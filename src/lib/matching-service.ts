import regexParser from 'regex-parser';
import type {MatchingDatabase} from './matching-database';
import {relist} from './regexps/relist';
import {escapeRegExp} from './regexps/utils';

const decodeRemaining = (value: string) => value
	.replaceAll('%3B', ';')
	.replaceAll('%2F', '/')
	.replaceAll('%3F', '?')
	.replaceAll('%3A', ':')
	.replaceAll('%40', '@')
	.replaceAll('%26', '&')
	.replaceAll('%3D', '=')
	.replaceAll('%2B', '+')
	.replaceAll('%24', '$')
	.replaceAll('%2C', ',')
	.replaceAll('%23', '#');

export type UrlMatch = {
	id: string;
	value: string;
	label: string;
	description: string | undefined;
};

export type CandidateStatement = {
	propertyId: string;
	value: string;
	links: string[];
};

type MatchFn = (url: string) => string | undefined;

const buildMatcher = (regex: RegExp, replacement?: string, validators?: RegExp[]): MatchFn => {
	const reIsEncoded = /%[\dA-Fa-f]{2}/.test(regex.source);

	return (url: string) => {
		if (url.startsWith('//')) {
			url = `https:${url}`;
		}

		let decodedUrl: string | undefined;
		try {
			decodedUrl = decodeURI(url);
		} catch {
			// Pass
		}

		let out: string | undefined;

		if (reIsEncoded || !decodedUrl || decodedUrl === url) {
			const match = regex.exec(url);
			if (match) {
				const value = replacement ? relist(match, replacement) : match[1];
				out = decodeURIComponent(value);
			}
		} else {
			const match = regex.exec(decodedUrl);
			if (match) {
				const value = replacement ? relist(match, replacement) : match[1];
				out = decodeRemaining(value);
			}
		}

		if (out !== undefined) {
			if (validators) {
				for (const validator of validators) {
					if (!validator.test(out)) {
						return;
					}
				}
			}

			return out;
		}
	};
};

export class MatchingService {
	matchers: Array<{propertyId: string; matcher: MatchFn}> = [];

	constructor(
		private readonly db: MatchingDatabase,
	) {
		this.setupMatchers();
	}

	public get refreshDate(): Date {
		return new Date(this.db.refreshDate);
	}

	public match(url: string, language: string): UrlMatch[] {
		const propertyValues: Record<string, UrlMatch> = {};

		for (const {propertyId: id, matcher} of this.matchers) {
			const value = matcher(url);
			if (value !== undefined) {
				const label = this.getLabel(id, language);
				const description = this.getDescription(id, language);
				propertyValues[`${id}:${value}`] = {id, value, label, description};
			}
		}

		return Object.values(propertyValues).sort(({id: a}, {id: b}) => Number(a.slice(1)) - Number(b.slice(1)));
	}

	public matchMany(links: string[], language: string) {
		const matches: Record<string, CandidateStatement> = {};

		for (const link of links) {
			const linkMatches = this.match(link, language);

			for (const {id: propertyId, value} of linkMatches) {
				const key = `${propertyId}:${value}`;
				if (matches[key] === undefined) {
					matches[key] = {
						propertyId,
						value,
						links: [link],
					};
				} else {
					matches[key].links.push(link);
				}
			}
		}

		return Object.values(matches).sort(
			(a, b) =>
				Number(a.propertyId.slice(1)) - Number(b.propertyId.slice(1)),
		);
	}

	private getLabel(propertyId: string, language: string) {
		if (language === 'en') {
			return this.db.labels.en[propertyId] ?? propertyId;
		}

		return this.db.labels[language]?.[propertyId] ?? this.db.labels.en[propertyId] ?? propertyId;
	}

	private getDescription(propertyId: string, language: string) {
		if (language === 'en') {
			return this.db.descriptions.en[propertyId];
		}

		return this.db.descriptions[language]?.[propertyId] ?? this.db.descriptions.en[propertyId];
	}

	private setupMatchers() {
		for (const [propertyId, {manualMatchers, formatters, validators}] of Object.entries(this.db.rules)) {
			if (manualMatchers) {
				for (const {regex, replacement} of manualMatchers) {
					const re = regexParser(regex);
					const validatorsRe = validators ? validators.map(({regex}) => regexParser(regex)) : undefined;
					const matcher = buildMatcher(re, replacement, validatorsRe);
					this.matchers.push({propertyId, matcher});
				}
			} else if (formatters) {
				for (const {formatter} of formatters) {
					const pattern = formatter.split(/(?=\$\d)|(?<=\$\d)/).map(x => /^\$\d$/.test(x) ? '(.+)' : escapeRegExp(x)).join('')
						.replace(/^https:\\\/\\\/(?:www\\\.)?/, String.raw`https?:\/\/(?:www\.)?`);
					const re = new RegExp(`^${pattern}$`);
					const validatorsRe = validators ? validators.map(({regex}) => regexParser(regex)) : undefined;
					const matcher = buildMatcher(re, undefined, validatorsRe);
					this.matchers.push({propertyId, matcher});
				}
			}
		}
	}
}
