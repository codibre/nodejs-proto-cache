import {
	AsyncTree,
	AsyncTreeChildren,
	ChainedObject,
	Tree,
	TreeKeys,
} from 'src/types';
import { createTraversalItem } from '../create-traversal-item';
import { StorageTraversalItem } from '../graph-types';
import { AsyncSimpleList } from './async-struct-helper';

async function* pushIterable<T>(
	children: () => AsyncTreeChildren<T>,
	level: number,
	node: ChainedObject | undefined,
): AsyncIterable<
	[
		AsyncTree<T> | Tree<T>,
		number,
		string | undefined,
		ChainedObject | undefined,
	]
> {
	const iterable = children();
	const nextLevel = level + 1;
	// eslint-disable-next-line guard-for-in
	for await (const [nextKey, nextValue] of iterable) {
		if (nextValue !== undefined) {
			yield [nextValue, nextLevel, nextKey, node];
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
		[
			AsyncTree<T> | Tree<T>,
			number,
			string | undefined,
			ChainedObject | undefined,
		]
	>,
	initialParentRef: ChainedObject | undefined,
): AsyncIterable<StorageTraversalItem<T>> {
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
		let node: ChainedObject | StorageTraversalItem<T> | undefined;
		if (key === undefined) {
			node = parentRef;
		} else {
			yield (node = createTraversalItem(key, level, parentRef, treeRef, value));
		}
		if (typeof children === 'function') {
			await list.push(pushIterable(children.bind(treeRef), level, node));
		} else if (children) {
			const nextLevel = level + 1;
			// eslint-disable-next-line guard-for-in
			for (const nextKey in children) {
				const nextValue = children[nextKey];
				if (nextValue) {
					await list.push([nextValue, nextLevel, nextKey, node]);
				}
			}
		}
	}
}
