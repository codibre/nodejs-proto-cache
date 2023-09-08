import { FullSetItem, Tree } from 'src/types';

export function checkFullSetItemChange<T>(
	item: { node: FullSetItem<T>; currentSerialized: string | undefined },
	changed: boolean,
	serialize: (payload: T) => string,
	currentTree: Tree<string>,
) {
	const { node, currentSerialized } = item;
	if (node.value !== undefined) {
		const serialized = serialize(node.value);
		if (serialized !== currentSerialized) {
			currentTree.v = serialized;
			changed = true;
		}
	}
	return changed;
}
