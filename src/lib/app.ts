import {MatchingService} from './matching-service';
import {buildMatchingDatabase, type MatchingDatabase} from '$lib/matching-database';

let matchingDatabase: Promise<MatchingDatabase> | undefined;
let matchingService: MatchingService | undefined;
let loading = false;

const databaseExpirationTimeMs = 60 * 60 * 1000; // 1 hour

export const rebuildInternals = async () => {
	if (loading) {
		return;
	}

	loading = true;
	matchingDatabase = buildMatchingDatabase();
	loading = false;
	const db = await matchingDatabase;
	matchingService = new MatchingService(db);
};

export const getMatchingDatabase = async () => {
	if (matchingDatabase === undefined) {
		await rebuildInternals();
	}

	const db = await matchingDatabase!;

	if (Date.now() - db.refreshDate > databaseExpirationTimeMs) {
		await rebuildInternals();
	}

	return db;
};

export const getMatchingService = async () => {
	if (matchingService === undefined) {
		await rebuildInternals();
	}

	return matchingService!;
};
