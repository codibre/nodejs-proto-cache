import { Tree, multiTreeValue } from '../types';
import { fluent } from '@codibre/fluent-iterable';
import { getTreeCurrentSerializedValue } from './get-tree-current-serialized-value';

/**
 * Convert a list of trees into a MultiTreeValue
 * @param trees The list of trees to be converted
 * @returns The MultiTreeValue containing the non expired rootLevel values
 */
export function getMultiTreeValueFromTrees<R>(trees: Tree<R>[], now: number) {
	return {
		[multiTreeValue]: fluent(trees)
			.map((tree) => getTreeCurrentSerializedValue(tree, now))
			.filter()
			.toArray(),
	};
}
