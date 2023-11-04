import { fluent, fluentAsync } from '@codibre/fluent-iterable';
import { TreeKeyCache, TreeKeys, buildKey } from '../../src';
import { initializeTest, toArray } from '../helpers';

const proto = TreeKeyCache.prototype;
describe(TreeKeyCache.name, () => {
	let target: TreeKeyCache<{ value: number }>;
	let map: Map<string, string>;
	let ttlMap: Map<string, number>;

	beforeEach(() => {
		({ ttlMap, map, target } = initializeTest(ttlMap, map, target));
	});

	describe(proto.preOrderDepthFirstSearch.name, () => {
		it('should throw an error when the method is called with a key level path but no getChildren is implemented on the storage', async () => {
			let thrownError: any;

			try {
				await toArray(target.preOrderDepthFirstSearch());
			} catch (err) {
				thrownError = err;
			}

			expect(thrownError).toBeInstanceOf(Error);
		});

		it('should return every node of the storage when preOrderDepthFirstSearch is called with no parameters', async () => {
			target['storage'].getChildren = async function* (
				start: string | undefined,
			) {
				const keys = map.keys();
				const childSize = !start ? 1 : start.split(':').length + 1;
				const set = new Set();
				if (start) {
					start = `${start}:`;
				}

				for (const key of keys) {
					if (!start || (key !== start && key.startsWith(start))) {
						const path = key.split(':').slice(0, childSize);
						const childKey = buildKey(path);
						if (!set.has(childKey)) {
							set.add(childKey);
							yield path[path.length - 1] as string;
						}
					}
				}
			};
			map.set('a1', JSON.stringify('a'));
			map.set('a1:b1:c1', JSON.stringify('b'));

			const result = await toArray(target.preOrderDepthFirstSearch());

			expect(
				result.map(({ nodeRef, ...x }) => ({
					...x,
					chainedKey: buildKey(nodeRef),
				})),
			).toEqual([
				{ key: 'a1', level: 1, value: 'a', chainedKey: 'a1' },
				{ key: 'b1', level: 2, value: undefined, chainedKey: 'a1:b1' },
				{ key: 'c1', level: 3, value: 'b', chainedKey: 'a1:b1:c1' },
				{ key: 'a', level: 1, value: { value: 10 }, chainedKey: 'a' },
				{ key: 'b', level: 2, value: { value: 20 }, chainedKey: 'a:b' },
				{ key: 'c', level: 3, value: { value: 30 }, chainedKey: 'a:b:c' },
				{ key: 'd', level: 4, value: { value: 40 }, chainedKey: 'a:b:c:d' },
				{ key: 'e', level: 5, value: { value: 50 }, chainedKey: 'a:b:c:d:e' },
				{ key: 'f', level: 6, value: { value: 60 }, chainedKey: 'a:b:c:d:e:f' },
			]);
		});

		it('should return every node that matches with the given path', async () => {
			target['storage'].getChildren = async function* (
				start: string | undefined,
			) {
				const keys = map.keys();
				const childSize = !start ? 1 : start.split(':').length + 1;
				const set = new Set();
				if (start) {
					start = `${start}:`;
				}

				for (const key of keys) {
					if (!start || (key !== start && key.startsWith(start))) {
						const path = key.split(':').slice(0, childSize);
						const childKey = buildKey(path);
						if (!set.has(childKey)) {
							set.add(childKey);
							yield path[path.length - 1] as string;
						}
					}
				}
			};
			map.set('a1', JSON.stringify('a'));
			map.set('a1:b1:c1', JSON.stringify('b'));

			const result = await toArray(target.preOrderDepthFirstSearch(['a', 'b']));

			expect(
				result.map(({ nodeRef, ...x }) => ({
					...x,
					chainedKey: buildKey(nodeRef),
				})),
			).toEqual([
				{ key: 'b', level: 2, value: { value: 20 }, chainedKey: 'a:b' },
				{ key: 'c', level: 3, value: { value: 30 }, chainedKey: 'a:b:c' },
				{ key: 'd', level: 4, value: { value: 40 }, chainedKey: 'a:b:c:d' },
				{ key: 'e', level: 5, value: { value: 50 }, chainedKey: 'a:b:c:d:e' },
				{ key: 'f', level: 6, value: { value: 60 }, chainedKey: 'a:b:c:d:e:f' },
			]);
		});

		it('should return every node of the storage when getVersions is implemented', async () => {
			target['storage'].getChildren = async function* (
				start: string | undefined,
			) {
				const keys = map.keys();
				const childSize = !start ? 1 : start.split(':').length + 1;
				const set = new Set();
				if (start) {
					start = `${start}:`;
				}

				for (const key of keys) {
					if (!start || (key !== start && key.startsWith(start))) {
						const path = key.split(':').slice(0, childSize);
						const childKey = buildKey(path);
						if (!set.has(childKey)) {
							set.add(childKey);
							yield path[path.length - 1] as string;
						}
					}
				}
			};
			target['storage'].getHistory = function (key: string) {
				const value = map.get(key);
				return fluentAsync([
					value,
					key === 'a:b:c:d'
						? JSON.stringify({
								[TreeKeys.value]: 99,
								[TreeKeys.children]: {
									1: {
										[TreeKeys.value]: 11,
									},
									2: {
										[TreeKeys.value]: 22,
									},
									3: {
										[TreeKeys.value]: 33,
										[TreeKeys.children]: {
											f: { v: 44 },
										},
									},
									e: {
										[TreeKeys.value]: 99,
										[TreeKeys.children]: {
											f: {
												[TreeKeys.value]: 11,
											},
										},
									},
								},
						  })
						: value,
				]);
			};
			const { valueSerializer } = target['options'];
			valueSerializer.deserializeList = (b) => {
				return {
					value: fluent(b)
						.filter()
						.map((item) => valueSerializer.deserialize(item))
						.map((x) => x.value ?? x)
						.join(',', (x) => x.toString()) as any,
				};
			};
			valueSerializer.deserializeAsyncList = async (b) => {
				return {
					value: (await fluentAsync(b)
						.filter()
						.map((item) => valueSerializer.deserialize(item))
						.map((x) => x.value ?? x)
						.join(',', (x) => x.toString())) as any,
				};
			};
			map.set('a1', JSON.stringify('a'));
			map.set('a1:b1:c1', JSON.stringify('b'));
			map.set('a:b:c2', JSON.stringify('v2'));

			const result = await toArray(target.preOrderDepthFirstSearch(['a', 'b']));

			expect(
				result.map(({ nodeRef, ...x }) => ({
					...x,
					chainedKey: buildKey(nodeRef),
				})),
			).toEqual([
				{ key: 'b', level: 2, value: { value: '20,20' }, chainedKey: 'a:b' },
				{
					key: 'c2',
					level: 3,
					value: { value: 'v2,v2' },
					chainedKey: 'a:b:c2',
				},
				{ key: 'c', level: 3, value: { value: '30,30' }, chainedKey: 'a:b:c' },
				{
					key: 'd',
					level: 4,
					value: { value: '40,99' },
					chainedKey: 'a:b:c:d',
				},
				{
					key: 'e',
					level: 5,
					value: { value: '50,99' },
					chainedKey: 'a:b:c:d:e',
				},
				{
					key: 'f',
					level: 6,
					value: { value: '60,11' },
					chainedKey: 'a:b:c:d:e:f',
				},
				{
					key: '3',
					level: 5,
					value: { value: '33' },
					chainedKey: 'a:b:c:d:3',
				},
				{
					key: 'f',
					level: 6,
					value: { value: '44' },
					chainedKey: 'a:b:c:d:3:f',
				},
				{
					key: '2',
					level: 5,
					value: { value: '22' },
					chainedKey: 'a:b:c:d:2',
				},
				{
					key: '1',
					level: 5,
					value: { value: '11' },
					chainedKey: 'a:b:c:d:1',
				},
			]);
		});
	});
});
