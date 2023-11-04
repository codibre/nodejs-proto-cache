import { Tree, TreeKeyCache, TreeKeys } from '../../src';
import * as dontWaitLib from 'src/utils/dont-wait';
import { initializeTest } from '../helpers';

const proto = TreeKeyCache.prototype;
describe(TreeKeyCache.name, () => {
	let target: TreeKeyCache<{ value: number }>;
	let map: Map<string, string>;
	let ttlMap: Map<string, number>;

	beforeEach(() => {
		({ ttlMap, map, target } = initializeTest(ttlMap, map, target));
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
