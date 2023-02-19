import makeChunkedFunction from './utils/make-chunked-function';
import {browser} from '$app/environment';

type FetchFn = (url: RequestInfo, init?: RequestInit | undefined) => Promise<Response>;

export type QueryServiceInit = {
	endpointUrl?: string;
	fetch?: FetchFn | undefined;
};

export type SparqlValueUri = {
	value: string;
	// Can be also unknown, e. g. http://www.wikidata.org/.well-known/genid/...
	type: 'uri';
};

export const isSparqlValueUri = (value: SparqlValue): value is SparqlValueUri => value.type === 'uri';

export type SparqlSimpleValueLiteral = {
	type: 'literal';
	value: string;
};

export const isSparqlSimpleValueLiteral = (value: SparqlValue): value is SparqlSimpleValueLiteral => value.type === 'literal' && !('xml:lang' in value) && !('datatype' in value);

export type SparqlValueMonolingualLiteral = {
	type: 'literal';
	value: string;
	'xml:lang': string;
};

export const isSparqlValueMonolingualLiteral = (value: SparqlValue): value is SparqlValueMonolingualLiteral => value.type === 'literal' && 'xml:lang' in value;

export type SparqlValueTypedLiteral = {
	// Common datatypes:
	// http://www.w3.org/2001/XMLSchema#dateTime
	// http://www.w3.org/2001/XMLSchema#decimal
	// http://www.w3.org/2001/XMLSchema#integer
	// http://www.w3.org/2001/XMLSchema#boolean
	// http://www.w3.org/2001/XMLSchema#float
	// http://www.opengis.net/ont/geosparql#wktLiteral -> /^\s*point\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)\s*$/i
	datatype: string;
	type: 'literal';
	value: string;
};

export const isSparqlValueTypedLiteral = (value: SparqlValue): value is SparqlValueTypedLiteral => value.type === 'literal' && 'datatype' in value;

export type SparqlValue = SparqlValueUri | SparqlSimpleValueLiteral | SparqlValueMonolingualLiteral | SparqlValueTypedLiteral;

export type QueryResponseBinding = Record<string, SparqlValue>;

export type QueryResponse = {
	head: {
		vars: string[];
	};
	results: {
		bindings: QueryResponseBinding[];
	};
};

export class QueryService {
	public static getInstance(init: QueryServiceInit = {}): QueryService {
		const endpointUrl = init.endpointUrl ?? 'https://query.wikidata.org/sparql';
		if (!QueryService.instances[endpointUrl]) {
			QueryService.instances[endpointUrl] = new QueryService(init);
		}

		return QueryService.instances[endpointUrl];
	}

	private static instances: Record<string, QueryService> = {};

	ask = makeChunkedFunction(async (queries: string[]) => this.askMany(queries), 50);

	private readonly endpointUrl: string;
	private readonly fetch: FetchFn;

	private constructor(init: QueryServiceInit = {}) {
		this.endpointUrl = init.endpointUrl ?? 'https://query.wikidata.org/sparql';
		this.fetch = init.fetch ?? (async (...args) => fetch(...args));
	}

	async get(query: string, options: RequestInit = {}) {
		const items = await this.request(query, options) as QueryResponse;
		return items.results.bindings;
	}

	async getFlat(query: string, options: RequestInit = {}) {
		const items = await this.get(query, options);
		const out: Array<Record<string, string>> = [];
		for (const item of items) {
			const flat: Record<string, string> = {};
			for (const [k, v] of Object.entries(item)) {
				flat[k] = v.value!;
			}

			out.push(flat);
		}

		return out;
	}

	async askOne(query: string, options: RequestInit = {}) {
		const response = await this.request(query, options) as {boolean: boolean};
		return response.boolean;
	}

	async request(query: string, options: RequestInit = {}) {
		const parameters = new URLSearchParams({
			query,
		});
		const headers: HeadersInit = {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Accept: 'application/sparql-results+json',
		};

		if (!browser) {
			headers['User-Agent'] = 'lockal-tools';
		}

		const init: RequestInit = {headers, ...options};
		let url = this.endpointUrl;
		if (query.length > 2000) {
			init.body = parameters;
			init.method = 'POST';
			headers['Content-type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
		} else {
			url += `?${parameters.toString()}`;
		}

		const response = await this.fetch(url, init);

		if (!response.ok) {
			throw new Error(`Failed to execute query: request failed with code ${response.status}`);
		}

		return await response.json() as Record<string, any>;
	}

	private async askMany(queries: string[]): Promise<Record<string, boolean>> {
		const subqueries = queries.map((x, i) => `{ ${x.trim().replace(/^ASK/, `SELECT ("${i}" as ?r)`)} LIMIT 1 }`);

		const query = `SELECT * {
			${subqueries.join('\nUNION\n')}
		}`;

		const results = await this.getFlat(query);
		const trueItems = new Set(results.map(({r}) => Number.parseInt(r, 10)));
		const trueItemsList: Array<[string, boolean]> = queries.map((x, i) => [x, trueItems.has(i)]);
		return Object.fromEntries(trueItemsList) as Record<string, boolean>;
	}
}
