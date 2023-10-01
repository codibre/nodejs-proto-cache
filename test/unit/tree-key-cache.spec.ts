import { Step, Tree, TreeKeyCache, TreeKeys } from '../../src';
import * as dontWaitLib from 'src/utils/dont-wait';

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
});
