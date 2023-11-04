import { Serializer, Tree } from 'src/types';
import { fluentAsync } from '@codibre/fluent-iterable';

export function getTreeListFromAsyncIterable<R>(
	treeSerializer: Serializer<Tree<R>, R>,
	value: AsyncIterable<R | undefined>,
) {
	return fluentAsync(value)
		.filter()
		.map((buffer) => treeSerializer.deserialize(buffer))
		.toArray();
}
