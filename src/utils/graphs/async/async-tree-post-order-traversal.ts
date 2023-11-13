import { ChainedObject, AnyTree, TreeKeys } from 'src/types';
import { createTraversalItem } from '../create-traversal-item';
import { AnyTraversalItem } from '../graph-types';
import { AsyncSimpleList } from './async-struct-helper';
import { isAsyncIterable } from '@codibre/fluent-iterable';

async function* asyncTreePostOrderTraversalRecursive<T>(
	treeRef: AnyTree<T>,
	list: AsyncSimpleList<
		[AnyTree<T>, string | undefined, ChainedObject | undefined]
	>,
	parentRef: ChainedObject | undefined,
	key: string | undefined,
	now: number,
): AsyncIterable<AnyTraversalItem<T>> {
	const { [TreeKeys.children]: children } = treeRef;
	const level = parentRef?.level ?? 0;
	let node: AnyTraversalItem<T> | undefined;
	if (key !== undefined) {
		node = createTraversalItem(key, level + 1, parentRef, treeRef, now);
	}
	const childrenResult =
		typeof children === 'function' ? children.call(treeRef) : children;
	if (isAsyncIterable(childrenResult)) {
		for await (const [nextKey, nextValue] of childrenResult) {
			if (nextValue !== undefined) {
				yield* asyncTreePostOrderTraversalRecursive<T>(
					nextValue,
					list,
					node ?? parentRef,
					nextKey,
					now,
				);
			}
		}
	} else if (childrenResult) {
		// eslint-disable-next-line guard-for-in
		for (const nextKey in childrenResult) {
			const nextTree = childrenResult[nextKey];
			if (nextTree) {
				await list.push([nextTree, nextKey, node]);
				yield* asyncTreePostOrderTraversalRecursive<T>(
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
export async function* asyncTreePostOrderTraversal<T>(
	treeRef: AnyTree<T>,
	list: AsyncSimpleList<
		[AnyTree<T>, string | undefined, ChainedObject | undefined]
	>,
	root: ChainedObject | undefined,
): AsyncIterable<AnyTraversalItem<T>> {
	const now = Date.now();
	yield* asyncTreePostOrderTraversalRecursive(
		treeRef,
		list,
		root,
		undefined,
		now,
	);
	const key = root?.key;
	if (key !== undefined) {
		const { level, parentRef } = root ?? { level: 0 };
		yield createTraversalItem(key, level, parentRef, treeRef, now);
	}
}
