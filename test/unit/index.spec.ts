import { Step, Tree, TreeKeyCache, TreeKeys } from './../../src';

const proto = TreeKeyCache.prototype;
describe(TreeKeyCache.name, () => {
	let target: TreeKeyCache<{ value: number }>;
	let map: Map<string, string>;

	beforeEach(() => {
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

		target = new TreeKeyCache(map, {
			keyLevelNodes: 4,
		});
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
	});

	describe(proto.deepTreeSet.name, () => {
		it('should add the path when some node in the key level does not exist and path goes up to key level, saving values changed during iteration', async () => {
			const iterable = target.deepTreeSet(['a', 'c', 'b'], () => ({
				value: 0,
			}));
			let first = true;

			for await (const item of iterable) {
				if (!item.value.value) {
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
		});

		it('should add the path when some node in the key level does not exist and path goes up to start tree level, saving values changed during iteration', async () => {
			const iterable = target.deepTreeSet(['a', 'c', 'b', 'd'], () => ({
				value: 0,
			}));
			let first = true;

			for await (const item of iterable) {
				if (!item.value.value) {
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
		});

		it('should add the path when some node in the tree level does not exist and path goes up to some tree level, saving values changed during iteration', async () => {
			const iterable = target.deepTreeSet(
				['a', 'b', 'c', 'd', 'f', 'j'],
				() => ({ value: 0 }),
			);
			let first = true;

			for await (const item of iterable) {
				if (!item.value.value) {
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
		});
	});

	describe(proto.fullTreeSet.name, () => {
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
		});
	});
});
