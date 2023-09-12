import { ChainedObject, buildKey } from '../../src';

describe(buildKey.name, () => {
	it('should return chained key', () => {
		const node: ChainedObject = {
			key: '3',
			parentRef: {
				key: '2',
				parentRef: {
					key: '1',
				},
			},
		};

		const result = buildKey(node);

		expect(result).toBe('1:2:3');
	});
});
