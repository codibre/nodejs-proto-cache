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

	describe(proto.prune.name, () => {
		const now = Date.now();
		beforeEach(() => {
			jest.spyOn(Date, 'now').mockReturnValue(now);
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
			map.set(
				'a:b:c:d2',
				JSON.stringify({
					[TreeKeys.value]: '{"value":40}',
					[TreeKeys.children]: {
						e: {
							v: '{"value":50}',
							[TreeKeys.deadline]: now - 10,
							[TreeKeys.children]: {
								f: { v: '{"value":60}', [TreeKeys.deadline]: now - 5 },
							},
						},
					},
				} as Tree<string>),
			);
			map.set(
				'a:b:c:d3',
				JSON.stringify({
					[TreeKeys.value]: '{"value":40}',
					[TreeKeys.children]: {
						e: {
							[TreeKeys.children]: {
								f: {},
							},
						},
					},
				} as Tree<string>),
			);
			target['storage'].randomIterate = async function* (
				pattern: string | undefined,
			) {
				const keys = Array.from(map.keys());
				const regex = pattern ? new RegExp(pattern) : undefined;
				for (const key of keys) {
					if (!regex || regex.test(key)) {
						yield key;
					}
				}
			};
		});

		it('should remove totally expired tree level branches', async () => {
			const result = await target.prune();

			expect(result).toBeUndefined();
			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
					[
						'a:b:c:d3',
						JSON.stringify({
							[TreeKeys.value]: '{"value":40}',
						} as Tree<string>),
					],
					[
						'a:b:c:d2',
						JSON.stringify({
							[TreeKeys.value]: '{"value":40}',
						} as Tree<string>),
					],
					[
						'a:b:c:d',
						JSON.stringify({
							[TreeKeys.value]: '{"value":40}',
							[TreeKeys.children]: {
								e: {
									[TreeKeys.children]: {
										f: { v: '{"value":60}', [TreeKeys.deadline]: now + 10 },
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

		it('should remove totally expired tree level branches just for nodes where all children are empty or expired', async () => {
			map.set(
				'a:b:c:d2',
				JSON.stringify({
					[TreeKeys.value]: '{"value":40}',
					[TreeKeys.children]: {
						e: {
							v: '{"value":50}',
							[TreeKeys.deadline]: now - 10,
							[TreeKeys.children]: {
								f: { v: '{"value":60}', [TreeKeys.deadline]: now - 5 },
								g: { v: '{"value":60}', [TreeKeys.deadline]: now + 5 },
								h: { v: '{"value":60}' },
							},
						},
						e2: {
							v: '{"value":50}',
							[TreeKeys.deadline]: now - 10,
							[TreeKeys.children]: {
								f: { v: '{"value":60}', [TreeKeys.deadline]: now - 5 },
								g: { v: '{"value":60}', [TreeKeys.deadline]: now - 5 },
							},
						},
					},
				} as Tree<string>),
			);

			const result = await target.prune();

			expect(result).toBeUndefined();
			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[
					[
						'a:b:c:d3',
						JSON.stringify({
							[TreeKeys.value]: '{"value":40}',
						} as Tree<string>),
					],
					[
						'a:b:c:d2',
						JSON.stringify({
							[TreeKeys.value]: '{"value":40}',
							[TreeKeys.children]: {
								e: {
									[TreeKeys.children]: {
										g: { v: '{"value":60}', [TreeKeys.deadline]: now + 5 },
										h: { v: '{"value":60}' },
									},
								},
							},
						} as Tree<string>),
					],
					[
						'a:b:c:d',
						JSON.stringify({
							[TreeKeys.value]: '{"value":40}',
							[TreeKeys.children]: {
								e: {
									[TreeKeys.children]: {
										f: { v: '{"value":60}', [TreeKeys.deadline]: now + 10 },
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

		it('should totally remove a tree when all nodes are empty or expired', async () => {
			map.clear();
			map.set(
				'a:b:c:d2',
				JSON.stringify({
					[TreeKeys.value]: '{"value":40}',
					[TreeKeys.deadline]: now - 10,
					[TreeKeys.children]: {
						e: {
							v: '{"value":50}',
							[TreeKeys.deadline]: now - 10,
							[TreeKeys.children]: {
								f: { v: '{"value":60}', [TreeKeys.deadline]: now - 5 },
								g: { v: '{"value":60}', [TreeKeys.deadline]: now - 5 },
								h: {},
							},
						},
						e2: {
							v: '{"value":50}',
							[TreeKeys.deadline]: now - 10,
							[TreeKeys.children]: {
								f: { v: '{"value":60}', [TreeKeys.deadline]: now - 5 },
								g: { v: '{"value":60}', [TreeKeys.deadline]: now - 5 },
							},
						},
					},
				} as Tree<string>),
			);

			const result = await target.prune();

			expect(result).toBeUndefined();
			expect(
				Array.from(map.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1)),
			).toEqual(
				[['a:b:c:d2', JSON.stringify({} as Tree<string>)]].sort((a, b) =>
					b[0]! > a[0]! ? 1 : -1,
				),
			);
		});
	});
});
