import { ChainedObject, SyncTree, TreeKeys } from 'src/types';
import { createTraversalItem } from './create-traversal-item';
import { SimpleList, SyncTraversalItem } from './graph-types';

/**
 * Implementation of pre order traversal for Trees
 * @param treeRef The tree to be traversed
 * @param keyNames the name for each node level. The level will be assumed as the name if it is not provided
 * @returns An iterables of { keys, value } objects, where keys contains the id for each node on the path
 */
export function* treePostOrderTraversal<T>(
	treeRef: SyncTree<T>,
	list: SimpleList<
		[SyncTree<T>, string | undefined, ChainedObject | undefined]
	>,
	parentRef: ChainedObject | undefined,
	key: string | undefined,
): Iterable<SyncTraversalItem<T>> {
	const { [TreeKeys.children]: children, [TreeKeys.value]: value } = treeRef;
	const level = parentRef?.level ?? 0;
	let node: SyncTraversalItem<T> | undefined;
	if (key !== undefined) {
		node = createTraversalItem<T>(key, level + 1, parentRef, treeRef, value);
	}
	if (children) {
		// eslint-disable-next-line guard-for-in
		for (const nextKey in children) {
			const nextTree = children[nextKey];
			if (nextTree) {
				list.push([nextTree, nextKey, node]);
				yield* treePostOrderTraversal<T>(
					nextTree,
					list,
					node ?? parentRef,
					nextKey,
				);
			}
		}
	}
	if (node) {
		yield node;
	}
}
