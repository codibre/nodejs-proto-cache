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
});
