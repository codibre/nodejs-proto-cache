import { Step } from 'src/types';

export function getStep<T>(
	deserialize: (item: string) => T,
	buffer: string | undefined,
	key: string,
	level: number,
	createLeaf?: () => T,
): Step<T> {
	let value: T;
	if (!buffer) {
		if (!createLeaf) {
			throw new TypeError('createLeaf not informed!');
		}
		value = createLeaf();
	} else {
		value = deserialize(buffer.toString());
	}
	return { key, value, level };
}
