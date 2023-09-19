import { ChainedObject, Tree } from '../../types';
import {
	TraversalItem,
	treeRefSymbol,
	valueSymbol,
} from './tree-pre-order-traversal';

export function createTraversalItem<T>(
	key: string,
	level: number,
	parentRef: ChainedObject | undefined,
	treeRef: Tree<T>,
	value?: T,
): TraversalItem<T> {
	return {
		key,
		parentRef,
		level,
		[valueSymbol]: value,
		[treeRefSymbol]: treeRef,
	};
}
