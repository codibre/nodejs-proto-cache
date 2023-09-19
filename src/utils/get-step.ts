import { ChainedObject, Step } from 'src/types';
import { TraversalItem } from './graphs/tree-pre-order-traversal';

export function getStep<T>(
	deserialize: (item: string) => T,
	buffer: string | undefined,
	nodeRef: TraversalItem<unknown>,
	createValue?: (node: ChainedObject) => T | undefined,
): Step<T> {
	let value: T | undefined;
	if (!buffer) {
		if (!createValue) {
			throw new TypeError('createValue not informed!');
		}
		value = createValue(nodeRef);
	} else {
		value = deserialize(buffer.toString());
	}
	return { key: nodeRef.key, value, level: nodeRef.level, nodeRef };
}
