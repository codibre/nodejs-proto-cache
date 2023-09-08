import { FullSetItem, Tree, TreeKeys } from '../../types';

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
			currentTree[TreeKeys.value] = serialized;
			changed = true;
		}
	}
	return changed;
}
