import { ChainedObject, Tree, TreeKeys } from '../../types';
import { createTraversalItem } from './create-traversal-item';

export interface SimpleList<T> {
	push(item: T): unknown;
	pop(): T | undefined;
	length: number;
}

export const treeRefSymbol = Symbol('treeRef');
export const valueSymbol = Symbol('value');

export interface TraversalItem<T> extends ChainedObject {
	[valueSymbol]: T | undefined;
	[treeRefSymbol]: Tree<T>;
}

/**
 * Implementation of pre order traversal for Trees
 * @param root The tree to be traversed
 * @param keyNames the name for each node level. The level will be assumed as the name if it is not provided
 * @returns An iterables of { keys, value } objects, where keys contains the id for each node on the path
 */
export function* treePreOrderTraversal<T>(
	root: Tree<T>,
	list: SimpleList<
		[Tree<T>, number, string | undefined, ChainedObject | undefined]
	>,
): Iterable<TraversalItem<T>> {
	list.push([root, 0, undefined, undefined]);
	while (list.length > 0) {
		const item = list.pop();
		if (!item) {
			throw new TypeError('Something went wrong processing list structure');
		}
		const [treeRef, level, key, parentRef] = item;
		const { [TreeKeys.children]: children, [TreeKeys.value]: value } = treeRef;
		let node: TraversalItem<T> | undefined;
		if (key) {
			node = createTraversalItem(key, level, parentRef, treeRef, value);
			yield node;
		}
		if (children) {
			const nextLevel = level + 1;
			// eslint-disable-next-line guard-for-in
			for (const nextKey in children) {
				const nextValue = children[nextKey];
				if (nextValue) {
					list.push([nextValue, nextLevel, nextKey, node]);
				}
			}
		}
	}
}
