import { Step, Tree, TreeKeyCache, TreeKeys, buildKey } from '../../src';
import * as dontWaitLib from 'src/utils/dont-wait';

async function toArray<T>(iterable: AsyncIterable<T>) {
	const result: T[] = [];
	for await (const item of iterable) {
		result.push(item);
	}
	return result;
}

const proto = TreeKeyCache.prototype;
describe(TreeKeyCache.name, () => {
	let target: TreeKeyCache<{ value: number }>;
	let map: Map<string, string>;
	let ttlMap: Map<string, number>;

	beforeEach(() => {
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
	});

	describe(proto.iteratePath.name, () => {
		it('should return an iterable for the values stored in partial keys and in the tree-value', async () => {
			const result: Step<{ value: number }>[] = [];

			const iterable = target.iteratePath(['a', 'b', 'c', 'd', 'e', 'f']);
			for await (const item of iterable) {
				result.push(item);
			}

			expect(result).toEqual([
				{
					key: 'a',
					level: 1,
					value: { value: 10 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'b',
					level: 2,
					value: { value: 20 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'c',
					level: 3,
					value: { value: 30 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'd',
					level: 4,
					value: { value: 40 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'e',
					level: 5,
					value: { value: 50 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'f',
					level: 6,
					value: { value: 60 },
					nodeRef: expect.any(Object),
				},
			]);
		});

		it('should return an iterable for the values stored in partial keys and in the tree-value up to the matching keys', async () => {
			const result: Step<{ value: number }>[] = [];

			const iterable = target.iteratePath(['a', 'b', 'c', 'd', 'e', 'g']);
			for await (const item of iterable) {
				result.push(item);
			}

			expect(result).toEqual([
				{
					key: 'a',
					level: 1,
					value: { value: 10 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'b',
					level: 2,
					value: { value: 20 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'c',
					level: 3,
					value: { value: 30 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'd',
					level: 4,
					value: { value: 40 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'e',
					level: 5,
					value: { value: 50 },
					nodeRef: expect.any(Object),
				},
			]);
		});

		it('should return an iterable for the values stored in partial keys and in the tree-value up to the last provided level key', async () => {
			const result: Step<{ value: number }>[] = [];

			const iterable = target.iteratePath(['a', 'b', 'c', 'd', 'e']);
			for await (const item of iterable) {
				result.push(item);
			}

			expect(result).toEqual([
				{
					key: 'a',
					level: 1,
					value: { value: 10 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'b',
					level: 2,
					value: { value: 20 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'c',
					level: 3,
					value: { value: 30 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'd',
					level: 4,
					value: { value: 40 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'e',
					level: 5,
					value: { value: 50 },
					nodeRef: expect.any(Object),
				},
			]);
		});

		it('should return an iterable for the values stored in partial keys and in the tree-value up to the root tree level', async () => {
			const result: Step<{ value: number }>[] = [];

			const iterable = target.iteratePath(['a', 'b', 'c', 'd']);
			for await (const item of iterable) {
				result.push(item);
			}

			expect(result).toEqual([
				{
					key: 'a',
					level: 1,
					value: { value: 10 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'b',
					level: 2,
					value: { value: 20 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'c',
					level: 3,
					value: { value: 30 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'd',
					level: 4,
					value: { value: 40 },
					nodeRef: expect.any(Object),
				},
			]);
		});

		it('should return an iterable for the values stored in partial keys when the provided keys got just up to there', async () => {
			const result: Step<{ value: number }>[] = [];

			const iterable = target.iteratePath(['a', 'b', 'c']);
			for await (const item of iterable) {
				result.push(item);
			}

			expect(result).toEqual([
				{
					key: 'a',
					level: 1,
					value: { value: 10 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'b',
					level: 2,
					value: { value: 20 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'c',
					level: 3,
					value: { value: 30 },
					nodeRef: expect.any(Object),
				},
			]);
		});

		it('should return an iterable for the values stored in partial keys and in the tree-value that are not expired yet', async () => {
			const result: Step<{ value: number }>[] = [];
			const now = 292929;
			jest.spyOn(Date, 'now').mockReturnValue(now);
			map.delete('a:b');
			map.set(
				'a:b:c:d',
				JSON.stringify({
					[TreeKeys.value]: '{"value":40}',
					[TreeKeys.children]: {
						e: {
							v: '{"value":50}',
							[TreeKeys.deadline]: now - 10,
							[TreeKeys.children]: {
								f: { v: '{"value":60}', [TreeKeys.deadline]: now + 10 },
							},
						},
					},
				} as Tree<string>),
			);

			const iterable = target.iteratePath(['a', 'b', 'c', 'd', 'e', 'f']);
			for await (const item of iterable) {
				result.push(item);
			}

			expect(result).toEqual([
				{
					key: 'a',
					level: 1,
					value: { value: 10 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'c',
					level: 3,
					value: { value: 30 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'd',
					level: 4,
					value: { value: 40 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'f',
					level: 6,
					value: { value: 60 },
					nodeRef: expect.any(Object),
				},
			]);
		});

		it('should memoize each redis parsed read, and use it in subsequent reads, when a memoizer is set', async () => {
			const memoizer = (target['options'].memoizer = new Map());
			jest.spyOn(memoizer, 'get');
			jest.spyOn(memoizer, 'set');

			const result1: Step<{ value: number }>[] = [];
			const result2: Step<{ value: number }>[] = [];

			const iterable1 = target.iteratePath(['a', 'b', 'c', 'd', 'e']);
			for await (const item of iterable1) {
				result1.push(item);
			}
			const iterable2 = target.iteratePath(['a', 'b', 'c', 'd', 'e']);
			for await (const item of iterable2) {
				result2.push(item);
			}

			expect(result1).toEqual(result2);
			expect(result1).toEqual([
				{
					key: 'a',
					level: 1,
					value: { value: 10 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'b',
					level: 2,
					value: { value: 20 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'c',
					level: 3,
					value: { value: 30 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'd',
					level: 4,
					value: { value: 40 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'e',
					level: 5,
					value: { value: 50 },
					nodeRef: expect.any(Object),
				},
			]);
			expect(memoizer.get).toHaveCallsLike(
				['a'],
				['a:b'],
				['a:b:c'],
				['a:b:c:d'],
				['a'],
				['a:b'],
				['a:b:c'],
				['a:b:c:d'],
			);
			expect(memoizer.set).toHaveCallsLike(
				['a', expect.anything()],
				['a:b', expect.anything()],
				['a:b:c', expect.anything()],
				['a:b:c:d', expect.anything()],
			);
		});
	});

	describe(proto.getNode.name, () => {
		it('should return the step at the end of the path', async () => {
			const result = await target.getNode(['a', 'b', 'c', 'd', 'e', 'f']);

			expect(result).toEqual({
				key: 'f',
				nodeRef: expect.any(Object),
				level: 6,
				value: { value: 60 },
			} as Step<{ value: number }>);
		});

		it('should return the step at the end of the path when it ends at storage level', async () => {
			const result = await target.getNode(['a', 'b', 'c']);

			expect(result).toEqual({
				key: 'c',
				nodeRef: expect.any(Object),
				level: 3,
				value: { value: 30 },
			} as Step<{ value: number }>);
		});

		it('should return the step at the end of the path when it is at the start of tree level', async () => {
			const result = await target.getNode(['a', 'b', 'c', 'd']);

			expect(result).toEqual({
				key: 'd',
				nodeRef: expect.any(Object),
				level: 4,
				value: { value: 40 },
			} as Step<{ value: number }>);
		});

		it('should return the step at the end of the path when it us at in the middle of tree level', async () => {
			const result = await target.getNode(['a', 'b', 'c', 'd', 'e']);

			expect(result).toEqual({
				key: 'e',
				nodeRef: expect.any(Object),
				level: 5,
				value: { value: 50 },
			} as Step<{ value: number }>);
		});

		it('should return undefined when a node is not found at the start of tree level', async () => {
			const result = await target.getNode(['a', 'b', 'c', 'd2']);

			expect(result).toBeUndefined();
		});

		it('should return undefined when the path does not exist at the storage level', async () => {
			const result = await target.getNode(['a', 'b2', 'c', 'd', 'e', 'f']);

			expect(result).toBeUndefined();
		});

		it('should return undefined when the path does not exist at the tree level', async () => {
			const result = await target.getNode(['a', 'b', 'c', 'd', 'e2', 'f']);

			expect(result).toBeUndefined();
		});
	});

	describe(proto.deepTreeSet.name, () => {
		let acquire: jest.SpyInstance;
		let release: jest.SpyInstance;

		beforeEach(() => {
			release = jest.fn().mockResolvedValue(undefined);
			acquire = jest
				.spyOn(target['options'].semaphore, 'acquire')
				.mockResolvedValue(release as any);
			jest
				.spyOn(dontWaitLib, 'dontWait')
				.mockImplementation((c: Function | undefined) => {
					c?.();
				});
		});

		it('should add the path when some node in the key level does not exist and path goes up to key level, saving values changed during iteration', async () => {
			const iterable = target.deepTreeSet(['a', 'c', 'b'], () => ({
				value: 0,
			}));
			let first = true;

			for await (const item of iterable) {
				if (item.value && !item.value.value) {
					if (first) first = false;
					else {
						item.value.value = 99;
					}
				}
			}

			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
					['a:c:b', '{"value":99}'],
					['a:c', '{"value":0}'],
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
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":10}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
			expect(acquire).toHaveCallsLike(['a'], ['a:c'], ['a:c:b']);
			expect(release).toHaveCallsLike([], [], []);
		});

		it('should add the path when some node in the key level does not exist and path goes up to start tree level, saving values changed during iteration', async () => {
			const iterable = target.deepTreeSet(['a', 'c', 'b', 'd'], () => ({
				value: 0,
			}));
			let first = true;

			for await (const item of iterable) {
				if (item.value && !item.value.value) {
					if (first) first = false;
					else {
						item.value.value = 99;
					}
				}
			}

			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
					['a:c:b', '{"value":99}'],
					['a:c', '{"value":0}'],
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
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":10}'],
					['a:c:b:d', JSON.stringify({ v: '{"value":99}' })],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
			expect(acquire).toHaveCallsLike(['a'], ['a:c'], ['a:c:b'], ['a:c:b:d']);
			expect(release).toHaveCallsLike([], [], [], []);
		});

		it('should add the path when some node in the tree level does not exist and path goes up to some tree level, saving values changed during iteration', async () => {
			const iterable = target.deepTreeSet(
				['a', 'b', 'c', 'd', 'f', 'j'],
				() => ({ value: 0 }),
			);
			let first = true;

			for await (const item of iterable) {
				if (item.value && !item.value.value) {
					if (first) first = false;
					else {
						item.value.value = 99;
					}
				}
			}

			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
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
								f: {
									v: '{"value":0}',
									[TreeKeys.children]: {
										j: { v: '{"value":99}' },
									},
								},
							},
						} as Tree<string>),
					],
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":10}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
			expect(acquire).toHaveCallsLike(['a'], ['a:b'], ['a:b:c'], ['a:b:c:d']);
			expect(release).toHaveCallsLike([], [], [], []);
		});

		it('should set the path when some node in the tree level is expired', async () => {
			const now = Date.now();
			map.set(
				'a:b:c:d',
				JSON.stringify({
					[TreeKeys.value]: '{"value":40}',
					[TreeKeys.children]: {
						e: {
							[TreeKeys.value]: '{"value":50}',
							[TreeKeys.deadline]: now - 10,
							[TreeKeys.children]: {
								f: { [TreeKeys.value]: '{"value":60}' },
							},
						},
					},
				} as Tree<string>),
			);

			const iterable = target.deepTreeSet(
				['a', 'b', 'c', 'd', 'e', 'f'],
				() => ({ value: 0 }),
			);
			let first = true;

			for await (const item of iterable) {
				if (item.value && item.level >= 4) {
					if (first) first = false;
					else {
						item.value.value = 99;
					}
				}
			}

			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
					[
						'a:b:c:d',
						JSON.stringify({
							[TreeKeys.value]: '{"value":40}',
							[TreeKeys.children]: {
								e: {
									[TreeKeys.value]: '{"value":99}',
									[TreeKeys.children]: {
										f: { [TreeKeys.value]: '{"value":99}' },
									},
								},
							},
						} as Tree<string>),
					],
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":10}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
			expect(acquire).toHaveCallsLike(['a'], ['a:b'], ['a:b:c'], ['a:b:c:d']);
			expect(release).toHaveCallsLike([], [], [], []);
		});
	});

	describe(proto.setNode.name, () => {
		it('should set node at storage level', async () => {
			const result = await target.setNode(['a', 'c', 'b'], { value: 123 });

			expect(result).toBeUndefined();
			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
					['a:c:b', '{"value":123}'],
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
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":10}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
		});

		it('should set node at storage level with the given ttl', async () => {
			const result = await target.setNode(
				['a', 'c', 'b'],
				{ value: 123 },
				1919,
			);

			expect(result).toBeUndefined();
			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
					['a:c:b', '{"value":123}'],
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
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":10}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
			expect(ttlMap.get('a:c:b')).toEqual(1919);
		});

		it('should set node at the start of tree level', async () => {
			const result = await target.setNode(['a', 'c', 'b', 'a'], { value: 123 });

			expect(result).toBeUndefined();
			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
					[
						'a:c:b:a',
						JSON.stringify({
							[TreeKeys.value]: '{"value":123}',
						}),
					],
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
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":10}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
		});

		it('should set node at the middle of tree level', async () => {
			const result = await target.setNode(['a', 'c', 'b', 'a', 'b'], {
				value: 123,
			});

			expect(result).toBeUndefined();
			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
					[
						'a:c:b:a',
						JSON.stringify({
							[TreeKeys.children]: {
								b: { [TreeKeys.value]: '{"value":123}' },
							},
						}),
					],
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
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":10}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
		});

		it('should set node at tree level with a given ttl', async () => {
			const now = Date.now();
			jest.spyOn(Date, 'now').mockReturnValue(now);

			const result = await target.setNode(
				['a', 'c', 'b', 'a', 'b'],
				{
					value: 123,
				},
				1919,
			);

			expect(result).toBeUndefined();
			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
					[
						'a:c:b:a',
						JSON.stringify({
							[TreeKeys.children]: {
								b: {
									[TreeKeys.value]: '{"value":123}',
									[TreeKeys.deadline]: now + 1919000,
								},
							},
						}),
					],
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
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":10}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
		});

		it('should set node at tree level with a given ttl, but keeping current storage ttl when it is greater', async () => {
			const now = Date.now();
			jest.spyOn(Date, 'now').mockReturnValue(now);
			ttlMap.set('a:c:b:a', 2909);

			const result = await target.setNode(
				['a', 'c', 'b', 'a', 'b'],
				{
					value: 123,
				},
				1919,
			);

			expect(result).toBeUndefined();
			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
					[
						'a:c:b:a',
						JSON.stringify({
							[TreeKeys.children]: {
								b: {
									[TreeKeys.value]: '{"value":123}',
									[TreeKeys.deadline]: now + 1919000,
								},
							},
						}),
					],
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
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":10}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
			expect(ttlMap.get('a:c:b:a')).toEqual(2909);
		});

		it('should set node at tree level with a given ttl, but replacing current storage ttl when it is lesser', async () => {
			const now = Date.now();
			jest.spyOn(Date, 'now').mockReturnValue(now);
			ttlMap.set('a:c:b:a', 1679);

			const result = await target.setNode(
				['a', 'c', 'b', 'a', 'b'],
				{
					value: 123,
				},
				1919,
			);

			expect(result).toBeUndefined();
			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
					[
						'a:c:b:a',
						JSON.stringify({
							[TreeKeys.children]: {
								b: {
									[TreeKeys.value]: '{"value":123}',
									[TreeKeys.deadline]: now + 1919000,
								},
							},
						}),
					],
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
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":10}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
			expect(ttlMap.get('a:c:b:a')).toEqual(1919);
		});

		it('should not set node at the start of storage level when value is undefined', async () => {
			const result = await target.setNode(
				['a', 'c', 'b', 'a'],
				undefined as any,
			);

			expect(result).toBeUndefined();
			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
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
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":10}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
		});

		it('should not set node at the start of tree level when value is undefined', async () => {
			const result = await target.setNode(
				['a', 'c', 'b', 'a'],
				undefined as any,
			);

			expect(result).toBeUndefined();
			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
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
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":10}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
		});

		it('should not set node at the middle of tree level when value is undefined', async () => {
			const result = await target.setNode(
				['a', 'c', 'b', 'a', 'b'],
				undefined as any,
			);

			expect(result).toBeUndefined();
			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
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
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":10}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
		});

		it('should set node at tree level with a given function ttl', async () => {
			const now = Date.now();
			jest.spyOn(Date, 'now').mockReturnValue(now);
			ttlMap.set('a:c:b:a', 1679);

			const result = await target.setNode(
				['a', 'c', 'b', 'a', 'b'],
				{
					value: 123,
				},
				(step) => (step.value?.value === 123 ? 1919 : 2929),
			);

			expect(result).toBeUndefined();
			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
					[
						'a:c:b:a',
						JSON.stringify({
							[TreeKeys.children]: {
								b: {
									[TreeKeys.value]: '{"value":123}',
									[TreeKeys.deadline]: now + 1919000,
								},
							},
						}),
					],
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
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":10}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
			expect(ttlMap.get('a:c:b:a')).toEqual(1919);
		});
	});

	describe(proto.fullTreeSet.name, () => {
		let acquire: jest.SpyInstance;
		let release: jest.SpyInstance;

		beforeEach(() => {
			release = jest.fn().mockResolvedValue(undefined);
			acquire = jest
				.spyOn(target['options'].semaphore, 'acquire')
				.mockResolvedValue(release as any);
			jest
				.spyOn(dontWaitLib, 'dontWait')
				.mockImplementation((c: Function | undefined) => {
					c?.();
				});
		});

		it('should update each tree node on storage', async () => {
			const tree: Tree<{ value: number }> = {
				[TreeKeys.children]: {
					a: {
						v: { value: 11 },
						[TreeKeys.children]: {
							b: {
								[TreeKeys.children]: {
									c: {
										v: { value: 30 },
										[TreeKeys.children]: {
											d: {
												[TreeKeys.children]: {
													e: {
														v: { value: 50 },
														[TreeKeys.children]: {
															f: {
																v: { value: 61 },
															},
														},
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			};
			const iterable = target.fullTreeSet(tree, () => ({
				value: 0,
			}));
			let first = true;

			for await (const item of iterable) {
				if (!item.value?.value) {
					if (first) first = false;
					else if (item.value) {
						item.value.value = 99;
					}
				}
			}

			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
					[
						'a:b:c:d',
						JSON.stringify({
							[TreeKeys.value]: '{"value":40}',
							[TreeKeys.children]: {
								e: {
									v: '{"value":50}',
									[TreeKeys.children]: {
										f: { v: '{"value":61}' },
									},
								},
							},
						} as Tree<string>),
					],
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":11}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
			expect(acquire).toHaveCallsLike(['a'], ['a:b'], ['a:b:c'], ['a:b:c:d']);
			expect(release).toHaveCallsLike([], [], [], []);
		});

		it('should update each tree node on storage and add any non existing node', async () => {
			const tree: Tree<{ value: number }> = {
				[TreeKeys.children]: {
					a: {
						v: { value: 11 },
						[TreeKeys.children]: {
							b1: {
								[TreeKeys.children]: {
									c1: {
										v: { value: 30 },
										[TreeKeys.children]: {
											d1: {
												[TreeKeys.children]: {
													e1: {
														v: { value: 50 },
														[TreeKeys.children]: {
															f1: {
																v: { value: 61 },
															},
														},
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			};
			const iterable = target.fullTreeSet(tree, () => ({
				value: 0,
			}));
			let first = true;

			for await (const item of iterable) {
				if (!item.value?.value) {
					if (first) first = false;
					else if (item.value) {
						item.value.value = 99;
					}
				}
			}

			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
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
					['a:b:c', '{"value":30}'],
					['a:b', '{"value":20}'],
					['a', '{"value":11}'],
					[
						'a:b1:c1:d1',
						JSON.stringify({
							c: {
								e1: { v: '{"value":50}', c: { f1: { v: '{"value":61}' } } },
							},
						}),
					],
					['a:b1:c1', '{"value":30}'],
					['a:b1', '{"value":0}'],
				].sort((a, b) => (b[0]! > a[0]! ? 1 : -1)),
			);
			expect(acquire).toHaveCallsLike(
				['a'],
				['a:b1'],
				['a:b1:c1'],
				['a:b1:c1:d1'],
			);
			expect(release).toHaveCallsLike([], [], [], []);
		});
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
	});

	describe(proto.preOrderBreadthFirstSearch.name, () => {
		it('should throw an error when the method is called with a key level path but no getChildren is implemented on the storage', async () => {
			let thrownError: any;

			try {
				await toArray(target.preOrderBreadthFirstSearch());
			} catch (err) {
				thrownError = err;
			}

			expect(thrownError).toBeInstanceOf(Error);
		});

		it('should return every node of the storage when preOrderBreadthFirstSearch is called with no parameters', async () => {
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

			const result = await toArray(target.preOrderBreadthFirstSearch());

			expect(
				result.map(({ nodeRef, ...x }) => ({
					...x,
					chainedKey: buildKey(nodeRef),
				})),
			).toEqual([
				{ key: 'a', level: 1, value: { value: 10 }, chainedKey: 'a' },
				{ key: 'a1', level: 1, value: 'a', chainedKey: 'a1' },
				{ key: 'b', level: 2, value: { value: 20 }, chainedKey: 'a:b' },
				{ key: 'b1', level: 2, value: undefined, chainedKey: 'a1:b1' },
				{ key: 'c', level: 3, value: { value: 30 }, chainedKey: 'a:b:c' },
				{ key: 'c1', level: 3, value: 'b', chainedKey: 'a1:b1:c1' },
				{ key: 'd', level: 4, value: { value: 40 }, chainedKey: 'a:b:c:d' },
				{ key: 'e', level: 5, value: { value: 50 }, chainedKey: 'a:b:c:d:e' },
				{ key: 'f', level: 6, value: { value: 60 }, chainedKey: 'a:b:c:d:e:f' },
			]);
		});

		it('should return every node of the storage when preOrderBreadthFirstSearch is called with a given path', async () => {
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
			map.set('a:b:c2', JSON.stringify('v2'));

			const result = await toArray(
				target.preOrderBreadthFirstSearch(['a', 'b']),
			);

			expect(
				result.map(({ nodeRef, ...x }) => ({
					...x,
					chainedKey: buildKey(nodeRef),
				})),
			).toEqual([
				{ key: 'b', level: 2, value: { value: 20 }, chainedKey: 'a:b' },
				{ key: 'c', level: 3, value: { value: 30 }, chainedKey: 'a:b:c' },
				{ key: 'c2', level: 3, value: 'v2', chainedKey: 'a:b:c2' },
				{ key: 'd', level: 4, value: { value: 40 }, chainedKey: 'a:b:c:d' },
				{ key: 'e', level: 5, value: { value: 50 }, chainedKey: 'a:b:c:d:e' },
				{ key: 'f', level: 6, value: { value: 60 }, chainedKey: 'a:b:c:d:e:f' },
			]);
		});
	});

	describe(proto.randomIterate.name, () => {
		it('should throw an error when randomIterate is not implemented', async () => {
			let thrownError: any;

			try {
				await toArray(target.randomIterate());
			} catch (err) {
				thrownError = err;
			}

			expect(thrownError).toBeInstanceOf(Error);
		});

		it('should traverse over all the keys of the storage in the storage natural order when no pattern is informed', async () => {
			map.set('a1:b1:c1', 'test');
			const keys = Array.from(map.keys());
			target['storage'].randomIterate = async function* (
				pattern: string | undefined,
			) {
				const regex = pattern ? new RegExp(pattern) : undefined;
				for (const key of keys) {
					if (!regex || regex.test(key)) {
						yield key;
					}
				}
			};

			const result = await toArray(target.randomIterate());

			expect(
				result.map(({ nodeRef, ...x }) => ({
					...x,
					chainedKey: buildKey(nodeRef),
				})),
			).toEqual([
				{ chainedKey: 'a', key: 'a', level: 1, value: { value: 10 } },
				{ chainedKey: 'a:b', key: 'b', level: 2, value: { value: 20 } },
				{ chainedKey: 'a:b:c', key: 'c', level: 3, value: { value: 30 } },
				{ chainedKey: 'a:b:c:d:e', key: 'e', level: 5, value: { value: 50 } },
				{ chainedKey: 'a:b:c:d:e:f', key: 'f', level: 6, value: { value: 60 } },
				{ chainedKey: 'a1:b1:c1', key: 'c1', level: 3, value: undefined },
			]);
		});
		it('should traverse over all the keys of the storage in the storage natural order when a pattern is informed', async () => {
			map.set('a1:b1:c1', 'test');
			const keys = Array.from(map.keys());
			target['storage'].randomIterate = async function* (
				pattern: string | undefined,
			) {
				const regex = pattern ? new RegExp(pattern) : undefined;
				for (const key of keys) {
					if (!regex || regex.test(key)) {
						yield key;
					}
				}
			};

			const result = await toArray(target.randomIterate('(c:d|b:c$)'));

			expect(
				result.map(({ nodeRef, ...x }) => ({
					...x,
					chainedKey: buildKey(nodeRef),
				})),
			).toEqual([
				{ chainedKey: 'a:b:c', key: 'c', level: 3, value: { value: 30 } },
				{ chainedKey: 'a:b:c:d:e', key: 'e', level: 5, value: { value: 50 } },
				{ chainedKey: 'a:b:c:d:e:f', key: 'f', level: 6, value: { value: 60 } },
			]);
		});
	});

	describe(proto.reprocessAllKeyLevelChildren.name, () => {
		it('should throw an error when randomIterate is not implemented', async () => {
			let thrownError: any;
			target['storage'].registerChild = jest.fn();

			try {
				await toArray(target.reprocessAllKeyLevelChildren());
			} catch (err) {
				thrownError = err;
			}

			expect(thrownError).toBeInstanceOf(Error);
		});

		it('should throw an error when registerChild is not implemented', async () => {
			let thrownError: any;
			target['storage'].randomIterate = jest.fn();

			try {
				await toArray(target.reprocessAllKeyLevelChildren());
			} catch (err) {
				thrownError = err;
			}

			expect(thrownError).toBeInstanceOf(Error);
		});

		it('should reprocess children one by one when no parameter is informed', async () => {
			target['storage'].randomIterate = async function* () {
				yield* map.keys();
			};
			target['storage'].registerChild = jest.fn().mockResolvedValue(undefined);

			const result = await toArray(target.reprocessAllKeyLevelChildren());

			expect(result).toEqual([
				[[undefined, 'a']],
				[[undefined, 'a']],
				[['a', 'b']],
				[[undefined, 'a']],
				[['a', 'b']],
				[['a:b', 'c']],
				[[undefined, 'a']],
				[['a', 'b']],
				[['a:b', 'c']],
				[['a:b:c', 'd']],
			]);
			expect(target['storage'].registerChild).toHaveCallsLike(
				[undefined, 'a'],
				[undefined, 'a'],
				['a', 'b'],
				[undefined, 'a'],
				['a', 'b'],
				['a:b', 'c'],
				[undefined, 'a'],
				['a', 'b'],
				['a:b', 'c'],
				['a:b:c', 'd'],
			);
		});

		it('should reprocess children in the given pace when a parameter is informed', async () => {
			target['storage'].randomIterate = async function* () {
				yield* map.keys();
			};
			target['storage'].registerChild = jest.fn().mockResolvedValue(undefined);

			const result = await toArray(target.reprocessAllKeyLevelChildren(3));

			expect(result).toEqual([
				[
					[undefined, 'a'],
					[undefined, 'a'],
					['a', 'b'],
				],
				[
					[undefined, 'a'],
					['a', 'b'],
					['a:b', 'c'],
				],
				[
					[undefined, 'a'],
					['a', 'b'],
					['a:b', 'c'],
				],
				[['a:b:c', 'd']],
			]);
			expect(target['storage'].registerChild).toHaveCallsLike(
				[undefined, 'a'],
				[undefined, 'a'],
				['a', 'b'],
				[undefined, 'a'],
				['a', 'b'],
				['a:b', 'c'],
				[undefined, 'a'],
				['a', 'b'],
				['a:b', 'c'],
				['a:b:c', 'd'],
			);
		});
	});
});
