import { ChainedObject, SyncTree } from 'src/types';
import { treePostOrderTraversal } from './tree-post-order-traversal';

/**
 * Implementation of pre order traversal, depth first search algorithm for Trees
 * @param tree The tree to be traversed
 * @param keyNames the name for each node level. The level will be assumed as the name if it is not provided
 * @param rootKey A root that led to the current tree
 * @returns An iterables of { keys, value } objects, where keys contains the id for each node on the path
 */
export function treePostOrderDepthFirstSearch<T>(
	tree: SyncTree<T>,
	parentRef: ChainedObject | undefined,
) {
	return treePostOrderTraversal(tree, [], parentRef);
}
