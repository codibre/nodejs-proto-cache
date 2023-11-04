import { Step, TreeKeyCache } from '../../src';
import { initializeTest } from '../helpers';

const proto = TreeKeyCache.prototype;
describe(TreeKeyCache.name, () => {
	let target: TreeKeyCache<{ value: number }>;
	let map: Map<string, string>;
	let ttlMap: Map<string, number>;

	beforeEach(() => {
		({ ttlMap, map, target } = initializeTest(ttlMap, map, target));
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
});
