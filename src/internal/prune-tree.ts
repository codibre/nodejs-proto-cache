import { ChainedObject, Tree, TreeKeys } from '../types';
import { treePostOrderDepthFirstSearch } from '../utils/graphs';
import { treeRefSymbol, valueSymbol } from '../utils/graphs/graph-types';
import { isUndefined } from './is-undefined';

/**
 * This method prunes a given Tree, returning true when it has
 * been pruned.
 * @param rootTree the tree To be pruned
 * @param parentRef the parent reference of the tree, if it is not root, so the traversal can be done correctly
 * @returns true when the tree has been pruned
 */
export function pruneTree<R = string>(
	rootTree: Tree<R>,
	parentRef: ChainedObject | undefined,
) {
	const iterable = treePostOrderDepthFirstSearch(rootTree, parentRef);
	let changed = false;
	const baseLevel = parentRef?.level ?? 0;
	const stack: Map<string, boolean>[] = [];
	for (const item of iterable) {
		const tree = item[treeRefSymbol];
		const children = tree[TreeKeys.children];
		const level = item.level - baseLevel + 1;
		if (stack.length > level + 1) {
			const map = stack.pop();
			if (map && children) {
				let removeAllChildren = true;
				for (const [key, empty] of map.entries()) {
					if (empty) {
						children[key] = undefined;
						changed = true;
					} else {
						removeAllChildren = false;
						const parent = (stack[level] ??= new Map());
						parent.set(item.key, false);
					}
				}
				if (removeAllChildren) {
					tree[TreeKeys.children] = undefined;
				}
			}
		}
		let undefinedValue = isUndefined(item[valueSymbol]);
		if (undefinedValue) {
			item[valueSymbol] = tree[TreeKeys.value] = undefined;
			tree[TreeKeys.deadline] = undefined;
			changed = true;
			undefinedValue = true;
		}
		const pos = (stack[level] ??= new Map());
		if (pos.get(item.key) !== false) {
			pos.set(item.key, undefinedValue);
		}
	}

	return changed;
}
