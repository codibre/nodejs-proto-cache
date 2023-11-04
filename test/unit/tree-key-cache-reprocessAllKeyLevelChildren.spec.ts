import { TreeKeyCache } from '../../src';
import { initializeTest, toArray } from '../helpers';

const proto = TreeKeyCache.prototype;
describe(TreeKeyCache.name, () => {
	let target: TreeKeyCache<{ value: number }>;
	let map: Map<string, string>;
	let ttlMap: Map<string, number>;

	beforeEach(() => {
		({ ttlMap, map, target } = initializeTest(ttlMap, map, target));
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
