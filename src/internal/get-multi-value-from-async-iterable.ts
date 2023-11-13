import { fluentAsync } from '@codibre/fluent-iterable';
import { MultiTreeValue, multiTreeValue } from '../types';

/**
 * Converts an async iterable into a MultiTreeValue
 * @param value the async iterable to be converted
 * @returns The resultant MultiTreeValue
 */
export async function getMultiTreeValueFromAsyncIterable<R>(
	value: AsyncIterable<R | undefined>,
): Promise<MultiTreeValue<R>> {
	return {
		[multiTreeValue]: await fluentAsync(value).filter().toArray(),
	};
}
