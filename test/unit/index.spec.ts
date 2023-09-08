import { Step, Tree, TreeKeyCache } from './../../src';

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
					v: '{"value":40}',
					c: {
						e: {
							v: '{"value":50}',
							c: {
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
				{ key: 'a', level: 1, value: { value: 10 } },
				{ key: 'b', level: 2, value: { value: 20 } },
				{ key: 'c', level: 3, value: { value: 30 } },
				{ key: 'd', level: 4, value: { value: 40 } },
				{ key: 'e', level: 5, value: { value: 50 } },
				{ key: 'f', level: 6, value: { value: 60 } },
			]);
		});

		it('should return an iterable for the values stored in partial keys and in the tree-value up to the matching keys', async () => {
			const result: Step<{ value: number }>[] = [];

			const iterable = target.iteratePath(['a', 'b', 'c', 'd', 'e', 'g']);
			for await (const item of iterable) {
				result.push(item);
			}

			expect(result).toEqual([
				{ key: 'a', level: 1, value: { value: 10 } },
				{ key: 'b', level: 2, value: { value: 20 } },
				{ key: 'c', level: 3, value: { value: 30 } },
				{ key: 'd', level: 4, value: { value: 40 } },
				{ key: 'e', level: 5, value: { value: 50 } },
			]);
		});

		it('should return an iterable for the values stored in partial keys and in the tree-value up to the last provided level key', async () => {
			const result: Step<{ value: number }>[] = [];

			const iterable = target.iteratePath(['a', 'b', 'c', 'd', 'e']);
			for await (const item of iterable) {
				result.push(item);
			}

			expect(result).toEqual([
				{ key: 'a', level: 1, value: { value: 10 } },
				{ key: 'b', level: 2, value: { value: 20 } },
				{ key: 'c', level: 3, value: { value: 30 } },
				{ key: 'd', level: 4, value: { value: 40 } },
				{ key: 'e', level: 5, value: { value: 50 } },
			]);
		});

		it('should return an iterable for the values stored in partial keys and in the tree-value up to the root tree level', async () => {
			const result: Step<{ value: number }>[] = [];

			const iterable = target.iteratePath(['a', 'b', 'c', 'd']);
			for await (const item of iterable) {
				result.push(item);
			}

			expect(result).toEqual([
				{ key: 'a', level: 1, value: { value: 10 } },
				{ key: 'b', level: 2, value: { value: 20 } },
				{ key: 'c', level: 3, value: { value: 30 } },
				{ key: 'd', level: 4, value: { value: 40 } },
			]);
		});

		it('should return an iterable for the values stored in partial keys when the provided keys got just up to there', async () => {
			const result: Step<{ value: number }>[] = [];

			const iterable = target.iteratePath(['a', 'b', 'c']);
			for await (const item of iterable) {
				result.push(item);
			}

			expect(result).toEqual([
				{ key: 'a', level: 1, value: { value: 10 } },
				{ key: 'b', level: 2, value: { value: 20 } },
				{ key: 'c', level: 3, value: { value: 30 } },
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
							v: '{"value":40}',
							c: {
								e: {
									v: '{"value":50}',
									c: {
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
							v: '{"value":40}',
							c: {
								e: {
									v: '{"value":50}',
									c: {
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
							v: '{"value":40}',
							c: {
								e: {
									v: '{"value":50}',
									c: {
										f: { v: '{"value":60}' },
									},
								},
								f: {
									v: '{"value":0}',
									c: {
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
});
