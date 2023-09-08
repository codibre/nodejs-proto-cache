import { Tree } from '../types';
import { TraversalItem } from './graphs/tree-pre-order-traversal';

export function getFullSetItem<T>(
	currentTree: Tree<string>,
	breadthNode: TraversalItem<T>,
	deserialize: (stringified: string) => T,
) {
	const currentSerialized = currentTree?.v;
	const baseLevel = breadthNode.level;
	const node = {
		oldValue: currentSerialized ? deserialize(currentSerialized) : undefined,
		value: breadthNode.value,
		key: breadthNode.key,
		level: baseLevel,
	};
	return { node, currentSerialized };
}
