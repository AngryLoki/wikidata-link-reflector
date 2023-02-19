import {error, json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {getMatchingService} from '$lib/app';
import type {UrlMatch} from '$lib/matching-service';
import {QueryService} from '$lib/query-service';

export type ReflectResponseOk = {
	items: UrlMatch[];
	refreshDate: string;
};

export type ReflectResponseError = {
	message: string;
};

export type ReflectResponse = ReflectResponseOk | ReflectResponseError;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const GET: RequestHandler = async ({url: {searchParams}}) => {
	const url = searchParams.get('url');
	const language = searchParams.get('lang') ?? 'en';
	const property = searchParams.get('property') ?? undefined;
	const type = searchParams.get('type') as 'item' | 'property' ?? 'property';

	if (!url) {
		// eslint-disable-next-line @typescript-eslint/no-throw-literal
		throw error(400, 'No URL provided');
	}

	if (!/^[a-z][a-z-]+$/.test(language)) {
		// eslint-disable-next-line @typescript-eslint/no-throw-literal
		throw error(400, 'Invalid language');
	}

	if (!['item', 'property'].includes(type)) {
		// eslint-disable-next-line @typescript-eslint/no-throw-literal
		throw error(400, 'Invalid type');
	}

	const matchingService = await getMatchingService();

	const refreshDate = matchingService.refreshDate.toISOString();
	const propertyResult = matchingService.match(url, language, property);

	if (type === 'property') {
		const result: ReflectResponse = {items: propertyResult, refreshDate};
		return json(result, {headers: {'Access-Control-Allow-Origin': '*'}});
	}

	const queryService = QueryService.getInstance();
	const subquery = propertyResult.map(({id, value}) => `{?item p:${id} [ps:${id} ${JSON.stringify(value)}; wikibase:rank ?rank]}`).join('\nUNION\n');
	const queryLanguage = language === 'en' ? 'en' : `${language},en`;
	const query = `SELECT DISTINCT ?item ?itemLabel ?itemDescription {
	  ${subquery}
	  FILTER(?rank != wikibase:DeprecatedRank)
	  SERVICE wikibase:label { bd:serviceParam wikibase:language "${queryLanguage}". }
	}`;

	const itemsResult: UrlMatch[] = [];
	const queryResult = await queryService.getFlat(query);
	for (const {item, itemLabel, itemDescription} of queryResult) {
		const qid = item.slice('http://www.wikidata.org/entity/'.length);
		itemsResult.push({
			id: qid,
			value: itemLabel,
			label: itemLabel,
			description: itemDescription,
			link: 'https://www.wikidata.org/wiki/' + qid,
		});
	}

	const result: ReflectResponse = {items: itemsResult, refreshDate};
	return json(result, {headers: {'Access-Control-Allow-Origin': '*'}});
};

// Enables CORS requests
// eslint-disable-next-line @typescript-eslint/naming-convention
export const OPTIONS: RequestHandler = () => new Response(undefined, {headers: {'Access-Control-Allow-Origin': '*'}});

