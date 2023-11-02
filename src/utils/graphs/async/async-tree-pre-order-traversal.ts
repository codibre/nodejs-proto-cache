import {
	AsyncTree,
	AsyncTreeChildren,
	ChainedObject,
	AnyTree,
	TreeKeys,
} from 'src/types';
import { createTraversalItem } from '../create-traversal-item';
import { AnyTraversalItem } from '../graph-types';
import { AsyncSimpleList } from './async-struct-helper';
import { isAsyncIterable } from '@codibre/fluent-iterable';

async function* pushIterable<T>(
	iterable: AsyncTreeChildren<T>,
	level: number,
	node: ChainedObject | undefined,
): AsyncIterable<
	[AnyTree<T>, number, string | undefined, ChainedObject | undefined]
> {
	const nextLevel = level + 1;
	if (isAsyncIterable(iterable)) {
		for await (const [nextKey, nextValue] of iterable) {
			if (nextValue !== undefined) {
				yield [nextValue, nextLevel, nextKey, node];
			}
		}
	}
}

/**
 * Implementation of pre order traversal for Trees
 * @param root The tree to be traversed
 * @param keyNames the name for each node level. The level will be assumed as the name if it is not provided
 * @returns An iterables of { keys, value } objects, where keys contains the id for each node on the path
 */
export async function* asyncTreePreOrderTraversal<T>(
	root: AsyncTree<T>,
	list: AsyncSimpleList<
		[AnyTree<T>, number, string | undefined, ChainedObject | undefined]
	>,
	initialParentRef: ChainedObject | undefined,
): AsyncIterable<AnyTraversalItem<T>> {
	await list.push([
		root,
		initialParentRef?.level ?? 0,
		undefined,
		initialParentRef,
	]);
	while (list.length > 0) {
		const item = await list.pop();
		if (!item) {
			break;
		}
		const [treeRef, level, key, parentRef] = item;
		const { [TreeKeys.children]: children, [TreeKeys.value]: value } = treeRef;
		let node: ChainedObject | AnyTraversalItem<T> | undefined;
		if (key === undefined) {
			node = parentRef;
		} else {
			yield (node = createTraversalItem<T>(
				key,
				level,
				parentRef,
				treeRef,
				value,
			));
		}
		const childrenResult =
			typeof children === 'function' ? children.call(treeRef) : children;
		if (isAsyncIterable(childrenResult)) {
			await list.push(pushIterable(childrenResult, level, node));
		} else if (children) {
			const nextLevel = level + 1;
			// eslint-disable-next-line guard-for-in
			for (const nextKey in childrenResult) {
				const nextValue = childrenResult[nextKey];
				if (nextValue) {
					await list.push([nextValue, nextLevel, nextKey, node]);
				}
			}
		}
	}
}
