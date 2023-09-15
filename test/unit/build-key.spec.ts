import { ChainedObject, buildKey } from '../../src';

describe(buildKey.name, () => {
	it('should return chained key', () => {
		const node: ChainedObject = {
			key: '3',
			level: 1,
			parentRef: {
				key: '2',
				level: 2,
				parentRef: {
					key: '1',
					level: 3,
				},
			},
		};

		const result = buildKey(node);

		expect(result).toBe('1:2:3');
	});
});
