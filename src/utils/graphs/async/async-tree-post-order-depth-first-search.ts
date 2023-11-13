import { AsyncTree, ChainedObject } from 'src/types';
import { AsyncStack } from './aync-stack';
import { asyncTreePostOrderTraversal } from './async-tree-post-order-traversal';

/**
 * Implementation of async pre order traversal, depth first search algorithm for Trees
 * @param tree The tree to be traversed
 * @param keyNames the name for each node level. The level will be assumed as the name if it is not provided
 * @returns An iterables of { keys, value } objects, where keys contains the id for each node on the path
 */
export function asyncTreePostOrderDepthFirstSearch<T>(
	tree: AsyncTree<T>,
	parentRef: ChainedObject | undefined,
) {
	return asyncTreePostOrderTraversal(tree, new AsyncStack(), parentRef);
}
