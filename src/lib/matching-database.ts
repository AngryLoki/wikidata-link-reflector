import {QueryService, type SparqlValueMonolingualLiteral} from './query-service';
import {pcreToRegexp} from './regexps/conversion';
import {fixFullMatchPattern, fixUrlPattern, validateUrlPattern} from './regexps/utils';

const testProperties = new Set([
	'P5979',
	'P5189',
	'P4047',
	'P2368',
	'P5188',
	'P2535',
	'P6604',
	'P1106',
	'P855',
	'P4045',
	'P1450',
	'P2536',
	'P370',
	'P626',
	'P578',
	'P368',
	'P369',
]);

type StatementErrors = Array<{
	statement: string;
	message: string;
}>;

type ValidationError = {
	propertyId: string;
	errors: Array<{
		statementId: string;
		message: string;
	}>;
};

type MatcherDescriptor = {
	regex: string;
	replacement?: string | undefined;
};

type FormatterDescriptor = {
	formatter: string;
	isBest: boolean;
	isOfficial: boolean;
	ifmatches?: string | undefined;
};

type ValidatorDescriptor = {
	type: 'FORMAT' | 'CONSTRAINT';
	regex: string;
};

export type MatchingRules = Record<string, {
	manualMatchers?: MatcherDescriptor[];
	formatters?: FormatterDescriptor[];
	validators?: ValidatorDescriptor[];
}>;

const queryService = QueryService.getInstance();

const attemptRegex = (pattern: string) => {
	const out = pcreToRegexp(pattern);
	if (!out) {
		throw new Error(`Unable to represent expression in ES6: \`${pattern}\``);
	}

	return out;
};

const propTypeFilter = `
?property wikibase:propertyType ?t .
FILTER(?t = wikibase:ExternalId || ?t = wikibase:String || ?t = wikibase:Url || ?t = wikibase:Monolingualtext || ?t = wikibase:CommonsMedia)
`;

const getManualMatchers = async () => {
	const query = `
		SELECT ?st ?property ?pattern ?replacement {
			?property rdf:type wikibase:Property ; p:P8966 ?st .
			?st wikibase:rank ?rank; ps:P8966 ?pattern .
			FILTER (?rank != wikibase:DeprecatedRank)
			${propTypeFilter}
			OPTIONAL {?st pq:P8967 ?replacement}
		}`;
	const json = await queryService.getFlat(query);

	const items: Record<string, MatcherDescriptor[]> = {};

	const errors: StatementErrors = [];
	for (const {st, property, pattern, replacement} of json) {
		const propertyId = property.slice('http://www.wikidata.org/entity/'.length);
		if (testProperties.has(propertyId)) {
			continue;
		}

		try {
			const fixedPattern = attemptRegex(pattern);
			const fixedReplacement: string | undefined = replacement === '\\1' ? undefined : replacement;

			if (fixedReplacement && /\\[^ULE1-9]/.test(fixedReplacement)) {
				throw new Error(`unsupported modifier in replacement: ${fixedReplacement}`);
			}

			const validationErrors = validateUrlPattern(propertyId, fixedPattern.pattern);

			fixedPattern.pattern = fixUrlPattern(fixedPattern.pattern);
			const regex = new RegExp(fixedPattern.pattern, fixedPattern.flags).toString();

			if (validationErrors.length > 0) {
				errors.push(...validationErrors.map(message => ({statement: st, message})));
				continue;
			}

			if (items[propertyId] === undefined) {
				items[propertyId] = [];
			}

			items[propertyId].push({regex, replacement: fixedReplacement});
		} catch (error: unknown) {
			errors.push({statement: st, message: (error as Error).message});
		}
	}

	return {items, errors};
};

const getValidators = async () => {
	const mainQuery = `
	SELECT ?st ?property ?pattern {
		?property rdf:type wikibase:Property ; p:P1793 ?st .
		FILTER EXISTS {?property wdt:P1630 ?formatter}
		?st rdf:type wikibase:BestRank; ps:P1793 ?pattern .
		${propTypeFilter}
	}`;

	const extraQuery = `
	SELECT ?st ?property ?pattern {
		?property rdf:type wikibase:Property ; p:P2302 ?st .
		FILTER EXISTS {?property wdt:P1630 ?formatter}
		?st wikibase:rank ?rank; ps:P2302 wd:Q21502404 ; pq:P1793 ?pattern .
		FILTER (?rank != wikibase:DeprecatedRank)
		${propTypeFilter}
	}`;

	const [mainRaw, extraRaw] = await Promise.all([
		queryService.getFlat(mainQuery),
		queryService.getFlat(extraQuery),
	]);

	const errors: StatementErrors = [];
	const items: Record<string, ValidatorDescriptor[]> = {};

	for (const {st, property, pattern} of mainRaw) {
		const pid = property.slice('http://www.wikidata.org/entity/'.length);
		if (testProperties.has(pid)) {
			continue;
		}

		try {
			const fixedPattern = attemptRegex(pattern);
			fixedPattern.pattern = fixFullMatchPattern(fixedPattern.pattern);

			if (items[pid] === undefined) {
				items[pid] = [];
			}

			items[pid].push({regex: new RegExp(fixedPattern.pattern, fixedPattern.flags).toString(), type: 'FORMAT'});
		} catch (error: unknown) {
			errors.push({statement: st, message: (error as Error).message});
		}
	}

	for (const {st, property, pattern} of extraRaw) {
		const propertyId = property.slice('http://www.wikidata.org/entity/'.length);
		if (testProperties.has(propertyId)) {
			continue;
		}

		try {
			const fixedPattern = attemptRegex(pattern);
			fixedPattern.pattern = fixFullMatchPattern(fixedPattern.pattern);

			if (items[propertyId] === undefined) {
				items[propertyId] = [];
			}

			items[propertyId].push({regex: new RegExp(fixedPattern.pattern, fixedPattern.flags).toString(), type: 'CONSTRAINT'});
		} catch (error: unknown) {
			errors.push({statement: st, message: (error as Error).message});
		}
	}

	return {items, errors};
};

const getUrlFormatters = async () => {
	const errors: StatementErrors = [];

	const propertyFormattersQuery = `
		SELECT ?st ?property ?kind ?formatter ?ifmatches ?isBest {
			hint:Query hint:optimizer "None".
			{?property p:P1630 ?st . ?st ps:P1630 ?formatter BIND('OFFICIAL' AS ?kind)}
			UNION
			{?property p:P3303 ?st . ?st ps:P3303 ?formatter BIND('THIRDPARTY' AS ?kind)}
			?property rdf:type wikibase:Property .
			?st wikibase:rank ?rank .
			FILTER (?rank != wikibase:DeprecatedRank)
			${propTypeFilter}
			OPTIONAL {?st rdf:type wikibase:BestRank . BIND("1" AS ?isBest)}
			OPTIONAL {?st pq:P8460 ?ifmatches}
	  	}`;
	const propertyFormattersRaw = await queryService.getFlat(propertyFormattersQuery);

	const items: Record<string, FormatterDescriptor[]> = {};

	for (const {st, property, kind, formatter, ifmatches, isBest} of propertyFormattersRaw) {
		const pid = property.slice('http://www.wikidata.org/entity/'.length);
		if (testProperties.has(pid)) {
			continue;
		}

		if (!/^https?:\/\//.test(formatter)) {
			continue;
		}

		if (!formatter.includes('$1')) {
			errors.push({statement: st, message: `No $1 found in formatter \`${formatter}\``});
		}

		const matcherDescriptor: FormatterDescriptor = {
			formatter,
			isBest: isBest === '1',
			isOfficial: kind === 'OFFICIAL',
		};

		try {
			if (ifmatches) {
				const fixedPattern = attemptRegex(ifmatches);
				fixedPattern.pattern = fixFullMatchPattern(fixedPattern.pattern);
				matcherDescriptor.ifmatches = new RegExp(fixedPattern.pattern, fixedPattern.flags).toString();
			}
		} catch (error: unknown) {
			errors.push({statement: st, message: (error as Error).message});
		}

		if (items[pid] === undefined) {
			items[pid] = [];
		}

		items[pid].push(matcherDescriptor);
	}

	return {items, errors};
};

const getValuesByLanguage = async (kind: 'rdfs:label' | 'schema:description') => {
	const query = `
	SELECT ?property ?value {
		?property rdf:type wikibase:Property .
		FILTER EXISTS {?property wdt:P1630|wdt:P3303|wdt:P8966 [] }
		${propTypeFilter}
		?property ${kind} ?value
	}`;

	const rawResult = await queryService.get(query);

	const valuesByLanguage: ValuesByLanguage = {};
	for (const {property, value} of rawResult) {
		const propId = property.value.slice('http://www.wikidata.org/entity/'.length);
		if (testProperties.has(propId)) {
			continue;
		}

		const language = (value as SparqlValueMonolingualLiteral)['xml:lang'];

		if (valuesByLanguage[language] === undefined) {
			valuesByLanguage[language] = {};
		}

		valuesByLanguage[language][propId] = value.value;
	}

	return valuesByLanguage;
};

export type ValuesByLanguage = Record<string, Record<string, string>>;

export type MatchingDatabase = {
	rules: MatchingRules;
	errors: ValidationError[];
	labels: ValuesByLanguage;
	descriptions: ValuesByLanguage;
	refreshDate: number;
};

export const buildMatchingDatabase = async (): Promise<MatchingDatabase> => {
	console.log('Building matching database');
	const startTime = performance.now();

	const [
		{items: manualMatchers, errors: errors1},
		{items: urlFormatters, errors: errors2},
		{items: validators, errors: errors3},
		labels,
		descriptions,
	] = await Promise.all([
		getManualMatchers(),
		getUrlFormatters(),
		getValidators(),
		getValuesByLanguage('rdfs:label'),
		getValuesByLanguage('schema:description'),
	]);

	console.log(`Retrieved matching database data in ${Math.round(performance.now() - startTime)} ms`);

	let items: MatchingRules = {};
	const statementErrors: StatementErrors = [...errors1, ...errors2, ...errors3];

	for (const propertyId of new Set([...Object.keys(manualMatchers), ...Object.keys(urlFormatters)])) {
		items[propertyId] = {
			manualMatchers: manualMatchers[propertyId]?.sort(({regex: a}, {regex: b}) => a.localeCompare(b)),
			formatters: urlFormatters[propertyId]?.sort((a, b) => {
				if (a.isOfficial && !b.isOfficial) {
					return -1;
				}

				if (b.isOfficial && !a.isOfficial) {
					return 1;
				}

				if (a.isBest && !b.isBest) {
					return -1;
				}

				if (b.isBest && !a.isBest) {
					return 1;
				}

				return a.formatter.localeCompare(b.formatter);
			}),
			validators: validators[propertyId],
		};
	}

	items = Object.fromEntries(
		Object.entries(items).sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1))),
	);
	const errorsList = statementErrors.map(({statement, message}) => {
		const [, propertyId, statementId] = /^http:\/\/www\.wikidata\.org\/entity\/statement\/(P\d+)-(.+)$/.exec(statement)!;
		return {
			propertyId,
			statementId,
			message,
		};
	});

	let errorGroups: Record<string, ValidationError> = {};
	for (const {propertyId, statementId, message} of errorsList) {
		if (errorGroups[propertyId] === undefined) {
			errorGroups[propertyId] = {
				propertyId,
				errors: [],
			};
		}

		errorGroups[propertyId].errors.push({statementId, message});
	}

	errorGroups = Object.fromEntries(Object.entries(errorGroups).sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1))));

	for (const group of Object.values(errorGroups)) {
		group.errors.sort((a, b) => a.message.localeCompare(b.message));
	}

	return {rules: items, errors: Object.values(errorGroups), labels, descriptions, refreshDate: Date.now()};
};
