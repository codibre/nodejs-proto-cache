import { createTraversalItem } from 'src/utils/graphs';
import { SyncTree, ChainedObject, Tree, TreeKeys } from '../types';
import { getKey } from './get-key';

/**
 * Creates a TraversalItem for a tree level node to be return in
 * a navigation traverse. It will return an error when key is
 * undefined, as that means some of the path items or the
 * informed are invalid
 * @param path string[] The complete path
 * @param level number, The level to be considered
 * @param tree The parent sub tree where the node is
 * @param parentRef The parent reference, if there is any
 * @param treeRef The tree reference where the tree level nodes started
 * @return nodeRef: the traversal item reference, and tree: a reference for the sub-tree where the node is
 */
export function getNextTreeNode<R>(
	path: string[],
	level: number,
	tree: SyncTree<R>,
	parentRef: ChainedObject | undefined,
	treeRef: Tree<R>,
	now: number,
) {
	const key = getKey(path, level);
	level++;
	const nextTree = tree[TreeKeys.children]?.[key];
	if (!nextTree) {
		return { nodeRef: undefined, tree: undefined };
	}
	return {
		nodeRef: createTraversalItem(key, level, parentRef, treeRef, now),
		tree: nextTree,
	};
}
