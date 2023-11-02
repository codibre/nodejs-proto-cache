import { ChainedObject, MultiTree, SyncTree, Tree } from 'src/types';
import { Queue } from './queue';
import { treePreOrderTraversal } from './tree-pre-order-traversal';
import {
	TraversalItem,
	MultiTraversalItem,
	SyncTraversalItem,
} from './graph-types';

/**
 * Implementation of pre order traversal, breadth first search algorithm for Trees
 * @param tree The tree to be traversed
 * @param keyNames the name for each node level. The level will be assumed as the name if it is not provided
 * @returns An iterables of { keys, value } objects, where keys contains the id for each node on the path
 */
export function treePreOrderBreadthFirstSearch<T>(
	tree: MultiTree<T>,
	parentRef: ChainedObject | undefined,
): Iterable<MultiTraversalItem<T>>;
export function treePreOrderBreadthFirstSearch<T>(
	tree: Tree<T>,
	parentRef: ChainedObject | undefined,
): Iterable<TraversalItem<T>>;
export function treePreOrderBreadthFirstSearch<T>(
	tree: SyncTree<T>,
	parentRef: ChainedObject | undefined,
): Iterable<SyncTraversalItem<T>>;
export function treePreOrderBreadthFirstSearch<T>(
	tree: SyncTree<T>,
	parentRef: ChainedObject | undefined,
): Iterable<SyncTraversalItem<T>> {
	return treePreOrderTraversal(tree, new Queue(), parentRef);
}
