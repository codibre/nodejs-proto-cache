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
				{ chainedKey: 'a:b:c:d', key: 'd', level: 4, value: { value: 40 } },
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
				{ chainedKey: 'a:b:c:d', key: 'd', level: 4, value: { value: 40 } },
				{ chainedKey: 'a:b:c:d:e', key: 'e', level: 5, value: { value: 50 } },
				{ chainedKey: 'a:b:c:d:e:f', key: 'f', level: 6, value: { value: 60 } },
			]);
		});
	});
});
