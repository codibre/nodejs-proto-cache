import { AsyncTree, ChainedObject, StorageTree, Tree } from '../../types';
import {
	AsyncTraversalItem,
	StorageTraversalItem,
	TraversalItem,
	treeRefSymbol,
	valueSymbol,
} from './graph-types';

export function createTraversalItem<T>(
	key: string,
	level: number,
	parentRef: ChainedObject | undefined,
	treeRef: Tree<T>,
	value?: T,
): TraversalItem<T>;
export function createTraversalItem<T>(
	key: string,
	level: number,
	parentRef: ChainedObject | undefined,
	treeRef: AsyncTree<T>,
	value?: T,
): AsyncTraversalItem<T>;
export function createTraversalItem<T>(
	key: string,
	level: number,
	parentRef: ChainedObject | undefined,
	treeRef: StorageTree<T>,
	value?: T,
): StorageTraversalItem<T>;
export function createTraversalItem<T>(
	key: string,
	level: number,
	parentRef: ChainedObject | undefined,
	treeRef: StorageTree<T>,
	value?: T,
): StorageTraversalItem<T> {
	return {
		key,
		parentRef,
		level,
		[valueSymbol]: value,
		[treeRefSymbol]: treeRef,
	};
}
