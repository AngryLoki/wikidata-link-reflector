import {error, json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {getMatchingService} from '$lib/app';
import type {UrlMatch} from '$lib/matching-service';

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

	if (!url) {
		// eslint-disable-next-line @typescript-eslint/no-throw-literal
		throw error(400, 'No URL provided');
	}

	const matchingService = await getMatchingService();

	const result: ReflectResponse = {
		items: matchingService.match(url, language, property),
		refreshDate: matchingService.refreshDate.toISOString(),
	};
	return json(result, {headers: {'Access-Control-Allow-Origin': '*'}});
};

// Enables CORS requests
// eslint-disable-next-line @typescript-eslint/naming-convention
export const OPTIONS: RequestHandler = () => new Response();

