export async function last<T>(iterable: AsyncIterable<T>) {
	let value: T | undefined;
	for await (const item of iterable) {
		value = item;
	}
	return value;
}
