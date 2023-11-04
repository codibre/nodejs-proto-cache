import { Tree, TreeKeyCache, TreeKeys } from '../../src';
import { initializeTest } from '../helpers';

const proto = TreeKeyCache.prototype;
describe(TreeKeyCache.name, () => {
	let target: TreeKeyCache<{ value: number }>;
	let map: Map<string, string>;
	let ttlMap: Map<string, number>;

	beforeEach(() => {
		({ ttlMap, map, target } = initializeTest(ttlMap, map, target));
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
});
