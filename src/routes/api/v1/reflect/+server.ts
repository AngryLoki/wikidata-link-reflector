import {error, json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {getMatchingService} from '$lib/app';
import type {UrlMatch} from '$lib/matching-service';

export type ReflectResponse = {
	items: UrlMatch[];
	refreshDate: string;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const GET: RequestHandler = async ({url: {searchParams}}) => {
	const matchingService = await getMatchingService();

	const url = searchParams.get('url');
	const language = searchParams.get('lang');
	if (!url) {
		// eslint-disable-next-line @typescript-eslint/no-throw-literal
		throw error(400, 'No URL provided');
	}

	const result: ReflectResponse = {
		items: matchingService.match(url, language ?? 'en'),
		refreshDate: matchingService.refreshDate.toISOString(),
	};
	return json(result);
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const OPTIONS: RequestHandler = () => {
	const response = new Response();
	response.headers.append('Access-Control-Allow-Origin', '*');
	return response;
};
