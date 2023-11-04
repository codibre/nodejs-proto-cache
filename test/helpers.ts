import { Tree, TreeKeyCache, TreeKeys } from 'src/index';

export async function toArray<T>(iterable: AsyncIterable<T>) {
	const result: T[] = [];
	for await (const item of iterable) {
		result.push(item);
	}
	return result;
}

export function initializeTest(
	ttlMap: Map<string, number>,
	map: Map<string, string>,
	target: TreeKeyCache<{ value: number }, string>,
) {
	ttlMap = new Map();
	map = new Map([
		['a', '{"value":10}'],
		['a:b', '{"value":20}'],
		['a:b:c', '{"value":30}'],
		[
			'a:b:c:d',
			JSON.stringify({
				[TreeKeys.value]: '{"value":40}',
				[TreeKeys.children]: {
					e: {
						v: '{"value":50}',
						[TreeKeys.children]: {
							f: { v: '{"value":60}' },
						},
					},
				},
			} as Tree<string>),
		],
	]);

	target = new TreeKeyCache(
		{
			get: (k) => map.get(k),
			set: (k, v, ttl) => {
				map.set(k, v);
				if (ttl) {
					ttlMap.set(k, ttl);
				}
			},
			getCurrentTtl: (k) => ttlMap.get(k),
		},
		{
			keyLevelNodes: 4,
		},
	);
	return { ttlMap, map, target };
}
