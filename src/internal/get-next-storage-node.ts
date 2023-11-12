import { Tree } from '../types';
import { createTraversalItem } from '../utils/graphs';
import { SyncTraversalItem } from '../utils/graphs/graph-types';
import { getKey } from './get-key';

/**
 * Creates a TraversalItem for a key level node to be return in
 * a navigation traverse. It will return an error when key is
 * undefined, as that means some of the path items or the
 * informed are invalid
 * @param path string[] The complete path
 * @param level number, The level to be considered
 * @param parentRef The parent reference, if there is any
 * @param treeRef The current tree reference
 */
export function getNextStorageNode<R>(
	path: string[],
	level: number,
	parentRef: SyncTraversalItem<R> | undefined,
	treeRef: Tree<R>,
	now: number,
) {
	return createTraversalItem(
		getKey(path, level),
		level + 1,
		parentRef,
		treeRef,
		now,
	);
}
