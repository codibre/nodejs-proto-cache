import { AsyncTree, ChainedObject, Tree, TreeKeys } from 'src/types';
import { createTraversalItem } from '../create-traversal-item';
import { StorageTraversalItem } from '../graph-types';
import { AsyncSimpleList } from './async-struct-helper';

/**
 * Implementation of pre order traversal for Trees
 * @param treeRef The tree to be traversed
 * @param keyNames the name for each node level. The level will be assumed as the name if it is not provided
 * @returns An iterables of { keys, value } objects, where keys contains the id for each node on the path
 */
export async function* asyncTreePostOrderTraversal<T>(
	treeRef: AsyncTree<T> | Tree<T>,
	list: AsyncSimpleList<
		[AsyncTree<T> | Tree<T>, string | undefined, ChainedObject | undefined]
	>,
	parentRef: ChainedObject | undefined,
	key: string | undefined,
): AsyncIterable<StorageTraversalItem<T>> {
	const { [TreeKeys.children]: children, [TreeKeys.value]: value } = treeRef;
	const level = parentRef?.level ?? 0;
	let node: StorageTraversalItem<T> | undefined;
	if (key !== undefined) {
		node = createTraversalItem(key, level + 1, parentRef, treeRef, value);
	}
	if (typeof children === 'function') {
		for await (const [nextKey, nextValue] of children.call(treeRef)) {
			if (nextValue !== undefined) {
				yield* asyncTreePostOrderTraversal<T>(
					nextValue,
					list,
					node ?? parentRef,
					nextKey,
				);
			}
		}
	} else if (children) {
		// eslint-disable-next-line guard-for-in
		for (const nextKey in children) {
			const nextTree = children[nextKey];
			if (nextTree) {
				await list.push([nextTree, nextKey, node]);
				yield* asyncTreePostOrderTraversal<T>(
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
