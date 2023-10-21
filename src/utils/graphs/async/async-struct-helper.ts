export interface Node<T> {
	value?: T;
	last?: Node<T>;
	next?: Node<T>;
}

export interface AsyncSimpleList<T> {
	push(item: T | AsyncIterable<T>): Promise<unknown> | unknown;
	pop(): Promise<T | undefined> | T | undefined;
	length: number;
}
export function isAsyncIterator<T>(
	value: AsyncIterator<T> | T | undefined,
): value is AsyncIterator<T> {
	return value !== null && typeof value === 'object' && 'next' in value;
}
export function isAsyncIterable<T>(
	value: AsyncIterable<T> | T | undefined,
): value is AsyncIterable<T> {
	return (
		value !== null && typeof value === 'object' && Symbol.asyncIterator in value
	);
}
