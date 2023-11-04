import { TreeKeyCache, buildKey } from '../../src';
import { initializeTest, toArray } from '../helpers';

const proto = TreeKeyCache.prototype;
describe(TreeKeyCache.name, () => {
	let target: TreeKeyCache<{ value: number }>;
	let map: Map<string, string>;
	let ttlMap: Map<string, number>;

	beforeEach(() => {
		({ ttlMap, map, target } = initializeTest(ttlMap, map, target));
	});

	describe(proto.postOrderDepthFirstSearch.name, () => {
		it('should throw an error when the method is called with a key level path but no getChildren is implemented on the storage', async () => {
			let thrownError: any;

			try {
				await toArray(target.postOrderDepthFirstSearch());
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

			const result = await toArray(target.postOrderDepthFirstSearch());

			expect(
				result.map(({ nodeRef, ...x }) => ({
					...x,
					chainedKey: buildKey(nodeRef),
				})),
			).toEqual([
				{ key: 'f', level: 6, value: { value: 60 }, chainedKey: 'a:b:c:d:e:f' },
				{ key: 'e', level: 5, value: { value: 50 }, chainedKey: 'a:b:c:d:e' },
				{ key: 'd', level: 4, value: { value: 40 }, chainedKey: 'a:b:c:d' },
				{ key: 'c', level: 3, value: { value: 30 }, chainedKey: 'a:b:c' },
				{ key: 'b', level: 2, value: { value: 20 }, chainedKey: 'a:b' },
				{ key: 'a', level: 1, value: { value: 10 }, chainedKey: 'a' },
				{ key: 'c1', level: 3, value: 'b', chainedKey: 'a1:b1:c1' },
				{ key: 'b1', level: 2, value: undefined, chainedKey: 'a1:b1' },
				{ key: 'a1', level: 1, value: 'a', chainedKey: 'a1' },
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

			const result = await toArray(
				target.postOrderDepthFirstSearch(['a', 'b']),
			);

			expect(
				result.map(({ nodeRef, ...x }) => ({
					...x,
					chainedKey: buildKey(nodeRef),
				})),
			).toEqual([
				{ key: 'f', level: 6, value: { value: 60 }, chainedKey: 'a:b:c:d:e:f' },
				{ key: 'e', level: 5, value: { value: 50 }, chainedKey: 'a:b:c:d:e' },
				{ key: 'd', level: 4, value: { value: 40 }, chainedKey: 'a:b:c:d' },
				{ key: 'c', level: 3, value: { value: 30 }, chainedKey: 'a:b:c' },
				{ key: 'b', level: 2, value: { value: 20 }, chainedKey: 'a:b' },
			]);
		});

		it('should return every node that matches with the given tree level path', async () => {
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

			const result = await toArray(
				target.postOrderDepthFirstSearch(['a', 'b', 'c', 'd']),
			);

			expect(
				result.map(({ nodeRef, ...x }) => ({
					...x,
					chainedKey: buildKey(nodeRef),
				})),
			).toEqual([
				{ key: 'f', level: 6, value: { value: 60 }, chainedKey: 'a:b:c:d:e:f' },
				{ key: 'e', level: 5, value: { value: 50 }, chainedKey: 'a:b:c:d:e' },
				{ key: 'd', level: 4, value: { value: 40 }, chainedKey: 'a:b:c:d' },
			]);
		});
	});
});
