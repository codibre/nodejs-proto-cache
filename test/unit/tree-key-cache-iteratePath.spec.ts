import { fluent, fluentAsync } from '@codibre/fluent-iterable';
import { Step, Tree, TreeKeyCache, TreeKeys } from '../../src';
import { initializeTest } from 'test/helpers';

const proto = TreeKeyCache.prototype;
describe(TreeKeyCache.name, () => {
	let target: TreeKeyCache<{ value: number }>;
	let map: Map<string, string>;
	let ttlMap: Map<string, number>;

	beforeEach(() => {
		({ ttlMap, map, target } = initializeTest(ttlMap, map, target));
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

		it('should return an iterable for the values stored in partial keys and in the tree-value that are not expired yet', async () => {
			const result: Step<{ value: number }>[] = [];
			const now = 292929;
			jest.spyOn(Date, 'now').mockReturnValue(now);
			map.delete('a:b');
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
					key: 'f',
					level: 6,
					value: { value: 60 },
					nodeRef: expect.any(Object),
				},
			]);
		});

		it('should memoize each redis parsed read, and use it in subsequent reads, when a memoizer is set', async () => {
			const memoizer = (target['options'].memoizer = new Map());
			jest.spyOn(memoizer, 'get');
			jest.spyOn(memoizer, 'set');

			const result1: Step<{ value: number }>[] = [];
			const result2: Step<{ value: number }>[] = [];

			const iterable1 = target.iteratePath(['a', 'b', 'c', 'd', 'e']);
			for await (const item of iterable1) {
				result1.push(item);
			}
			const iterable2 = target.iteratePath(['a', 'b', 'c', 'd', 'e']);
			for await (const item of iterable2) {
				result2.push(item);
			}

			expect(result1).toEqual(result2);
			expect(result1).toEqual([
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
			expect(memoizer.get).toHaveCallsLike(
				['a'],
				['a:b'],
				['a:b:c'],
				['a:b:c:d'],
				['a'],
				['a:b'],
				['a:b:c'],
				['a:b:c:d'],
			);
			expect(memoizer.set).toHaveCallsLike(
				['a', expect.anything()],
				['a:b', expect.anything()],
				['a:b:c', expect.anything()],
				['a:b:c:d', expect.anything()],
			);
		});

		it('should throw an error during iteration when an async iterable is returned from storage.get but no deserializeAsyncList is implemented on Serializer', async () => {
			target['storage'].getHistory = jest
				.fn()
				.mockReturnValue(fluentAsync([]) as any);
			const { valueSerializer } = target['options'];
			valueSerializer.deserializeList = (list) =>
				fluent(list)
					.filter()
					.map((b) => valueSerializer.deserialize(b))
					.execute((b) => (b.value *= 2))
					.first();
			let thrownError: any;

			try {
				const iterable1 = target.iteratePath(['a', 'b', 'c', 'd', 'e']);
				await fluentAsync(iterable1).last();
			} catch (err) {
				thrownError = err;
			}

			expect(thrownError).toBeInstanceOf(Error);
			expect(thrownError.message).toBe(
				'deserializeAsyncList is not implemented on valueSerializer',
			);
		});

		it('should return an iterable for the values stored in partial keys and in the tree-value deserialized with deserializeList, when asyncIterables are returned by stored.get', async () => {
			const get = map.get.bind(map);
			target['storage'].getHistory = jest.fn().mockImplementation((k): any => {
				return fluentAsync([get(k)]);
			});
			const { valueSerializer } = target['options'];
			valueSerializer.deserializeList = (list) =>
				fluent(list)
					.filter()
					.map((b) => valueSerializer.deserialize(b))
					.execute((b) => (b.value *= 2))
					.first();
			valueSerializer.deserializeAsyncList = (list) =>
				fluentAsync(list)
					.filter()
					.map((b) => valueSerializer.deserialize(b))
					.execute((b) => (b.value *= 2))
					.first();
			const result: Step<{ value: number }>[] = [];

			const iterable = target.iteratePath(['a', 'b', 'c', 'd', 'e', 'f']);
			for await (const item of iterable) {
				result.push(item);
			}

			expect(result).toEqual([
				{
					key: 'a',
					level: 1,
					value: { value: 20 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'b',
					level: 2,
					value: { value: 40 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'c',
					level: 3,
					value: { value: 60 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'd',
					level: 4,
					value: { value: 80 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'e',
					level: 5,
					value: { value: 100 },
					nodeRef: expect.any(Object),
				},
				{
					key: 'f',
					level: 6,
					value: { value: 120 },
					nodeRef: expect.any(Object),
				},
			]);
		});
	});
});
