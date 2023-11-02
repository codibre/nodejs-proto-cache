import { ChainedObject, SyncTree, TreeKeys } from '../../types';
import { createTraversalItem } from './create-traversal-item';
import {
	MultiTraversalItem,
	SimpleList,
	SyncTraversalItem,
	TraversalItem,
} from './graph-types';

/**
 * Implementation of pre order traversal for Trees
 * @param root The tree to be traversed
 * @param keyNames the name for each node level. The level will be assumed as the name if it is not provided
 * @returns An iterables of { keys, value } objects, where keys contains the id for each node on the path
 */
export function* treePreOrderTraversal<T>(
	root: SyncTree<T>,
	list: SimpleList<
		[SyncTree<T>, number, string | undefined, ChainedObject | undefined]
	>,
	startParentRef: ChainedObject | undefined,
): Iterable<SyncTraversalItem<T>> {
	list.push([root, startParentRef?.level ?? 0, undefined, startParentRef]);
	while (list.length > 0) {
		const item = list.pop();
		if (!item) {
			throw new TypeError('Something went wrong processing list structure');
		}
		const [treeRef, level, key, parentRef] = item;
		const { [TreeKeys.children]: children, [TreeKeys.value]: value } = treeRef;
		let node:
			| ChainedObject
			| MultiTraversalItem<T>
			| TraversalItem<T>
			| undefined;
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
