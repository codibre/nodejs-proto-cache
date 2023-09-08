export function getKey(keys: string[], index: number) {
	const key = keys[index];
	if (key === undefined) {
		throw new TypeError(`Undefined key at position ${index}`);
	}
	return key;
}
