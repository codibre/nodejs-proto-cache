import { AsyncTree, ChainedObject } from 'src/types';
import { asyncTreePreOrderTraversal } from './async-tree-pre-order-traversal';
import { AsyncStack } from './aync-stack';

/**
 * Implementation of async pre order traversal, depth first search algorithm for Trees
 * @param tree The tree to be traversed
 * @param keyNames the name for each node level. The level will be assumed as the name if it is not provided
 * @returns An iterables of { keys, value } objects, where keys contains the id for each node on the path
 */
export function asyncTreePreOrderDepthFirstSearch<T>(
	tree: AsyncTree<T>,
	parentRef: ChainedObject | undefined,
) {
	return asyncTreePreOrderTraversal(tree, new AsyncStack(), parentRef);
}
