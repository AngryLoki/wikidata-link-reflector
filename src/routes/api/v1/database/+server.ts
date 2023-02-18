import {error, json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {getMatchingDatabase} from '$lib/app';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const GET: RequestHandler = async ({url: {searchParams}}) => {
	const property = searchParams.get('property');
	const language = searchParams.get('lang') ?? 'en';

	if (!property) {
		// eslint-disable-next-line @typescript-eslint/no-throw-literal
		throw error(400, 'No property provided');
	}

	const result = await getMatchingDatabase();
	const rules = result.rules[property];

	if (rules === undefined) {
		// eslint-disable-next-line @typescript-eslint/no-throw-literal
		throw error(404, 'Property not found in matching database');
	}

	return json(result.rules[property]);
};
