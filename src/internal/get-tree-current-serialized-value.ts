import {
	AnyTree,
	AsyncTree,
	MultiTree,
	MultiTreeValue,
	Tree,
	TreeKeys,
	TreeValue,
} from '../types';

/**
 * Returns the root value for a tree, if it is not expired
 * @param tree the tree reference
 * @param now The current momento to be considered during expiration analysis
 */
export function getTreeCurrentSerializedValue<R>(
	tree: Tree<R>,
	now: number,
): R | undefined;
/**
 * Returns the root value for a tree, if it is not expired
 * @param tree the tree reference
 * @param now The current momento to be considered during expiration analysis
 */
export function getTreeCurrentSerializedValue<R>(
	tree: MultiTree<R>,
	now: number,
): MultiTreeValue<R> | undefined;
/**
 * Returns the root value for a tree, if it is not expired
 * @param tree the tree reference
 * @param now The current momento to be considered during expiration analysis
 */
export function getTreeCurrentSerializedValue<R>(
	tree: AsyncTree<R>,
	now: number,
): TreeValue<R> | undefined;
/**
 * Returns the root value for a tree, if it is not expired
 * @param tree the tree reference
 * @param now The current momento to be considered during expiration analysis
 */
export function getTreeCurrentSerializedValue<R>(
	tree: AnyTree<R>,
	now: number,
): TreeValue<R> | undefined;
export function getTreeCurrentSerializedValue<R>(
	tree: AnyTree<R>,
	now: number,
) {
	const { [TreeKeys.deadline]: deadline } = tree;
	const currentSerialized =
		!deadline || deadline > now ? tree[TreeKeys.value] : undefined;
	return currentSerialized;
}
