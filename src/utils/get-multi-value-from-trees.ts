import { Tree, TreeKeys, multiTreeValue } from '../types';
import { fluent } from '@codibre/fluent-iterable';

export function getMultiValueFromTrees<R>(trees: Tree<R>[]) {
	return {
		[multiTreeValue]: fluent(trees).map(TreeKeys.value).filter().toArray(),
	};
}
