import { ChainedObject, AnyTree, TreeKeys } from 'src/types';
import { createTraversalItem } from '../create-traversal-item';
import { AnyTraversalItem } from '../graph-types';
import { AsyncSimpleList } from './async-struct-helper';
import { isAsyncIterable } from '@codibre/fluent-iterable';

/**
 * Implementation of pre order traversal for Trees
 * @param treeRef The tree to be traversed
 * @param keyNames the name for each node level. The level will be assumed as the name if it is not provided
 * @returns An iterables of { keys, value } objects, where keys contains the id for each node on the path
 */
export async function* asyncTreePostOrderTraversal<T>(
	treeRef: AnyTree<T>,
	list: AsyncSimpleList<
		[AnyTree<T>, string | undefined, ChainedObject | undefined]
	>,
	parentRef: ChainedObject | undefined,
	key: string | undefined,
): AsyncIterable<AnyTraversalItem<T>> {
	const { [TreeKeys.children]: children, [TreeKeys.value]: value } = treeRef;
	const level = parentRef?.level ?? 0;
	let node: AnyTraversalItem<T> | undefined;
	if (key !== undefined) {
		node = createTraversalItem(key, level + 1, parentRef, treeRef, value);
	}
	const childrenResult =
		typeof children === 'function' ? children.call(treeRef) : children;
	if (isAsyncIterable(childrenResult)) {
		for await (const [nextKey, nextValue] of childrenResult) {
			if (nextValue !== undefined) {
				yield* asyncTreePostOrderTraversal<T>(
					nextValue,
					list,
					node ?? parentRef,
					nextKey,
				);
			}
		}
	} else if (childrenResult) {
		// eslint-disable-next-line guard-for-in
		for (const nextKey in childrenResult) {
			const nextTree = childrenResult[nextKey];
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
