import { ChainedObject, SyncTree, TreeKeys } from 'src/types';
import { createTraversalItem } from './create-traversal-item';
import { SimpleList, SyncTraversalItem } from './graph-types';

function* treePostOrderTraversalRecursive<T>(
	treeRef: SyncTree<T>,
	list: SimpleList<
		[SyncTree<T>, string | undefined, ChainedObject | undefined]
	>,
	parentRef: ChainedObject | undefined,
	key: string | undefined,
	now: number,
): Iterable<SyncTraversalItem<T>> {
	const { [TreeKeys.children]: children } = treeRef;
	const level = parentRef?.level ?? 0;
	let node: SyncTraversalItem<T> | undefined;
	if (key !== undefined) {
		node = createTraversalItem<T>(key, level + 1, parentRef, treeRef, now);
	}
	if (children) {
		// eslint-disable-next-line guard-for-in
		for (const nextKey in children) {
			const nextTree = children[nextKey];
			if (nextTree) {
				list.push([nextTree, nextKey, node]);
				yield* treePostOrderTraversalRecursive<T>(
					nextTree,
					list,
					node ?? parentRef,
					nextKey,
					now,
				);
			}
		}
	}
	if (node) {
		yield node;
	}
}

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
	root: ChainedObject | undefined,
): Iterable<SyncTraversalItem<T>> {
	const now = Date.now();
	const key = root?.key;
	yield* treePostOrderTraversalRecursive(treeRef, list, root, undefined, now);
	if (key !== undefined) {
		const { level, parentRef } = root ?? { level: 0 };
		yield createTraversalItem<T>(key, level, parentRef, treeRef, now);
	}
}
