import { MultiTreeValue, multiTreeValue } from '../types';

/**
 * Converts an async iterable into a MultiTreeValue
 * @param value the async iterable to be converted
 * @returns The resultant MultiTreeValue
 */
export async function getMultiTreeValueFromAsyncIterable<R>(
	value: AsyncIterable<R | undefined>,
	getMultiValue: (value: AsyncIterable<R | undefined>) => Promise<R[]>,
): Promise<MultiTreeValue<R>> {
	return {
		[multiTreeValue]: await getMultiValue(value),
	};
}
