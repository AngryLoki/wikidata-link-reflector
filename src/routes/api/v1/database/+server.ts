import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {getMatchingDatabase} from '$lib/app';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const GET: RequestHandler = async () => {
	const result = await getMatchingDatabase();
	return json(result.rules);
};
