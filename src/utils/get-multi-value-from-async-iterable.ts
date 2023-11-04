import { fluentAsync } from '@codibre/fluent-iterable';
import { multiTreeValue } from '../types';

export async function getMultiValueFromAsyncIterable<R>(
	value: AsyncIterable<R | undefined>,
) {
	return {
		[multiTreeValue]: await fluentAsync(value).filter().toArray(),
	};
}
