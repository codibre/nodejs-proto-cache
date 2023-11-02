import {
	AsyncTree,
	ChainedObject,
	MultiTree,
	MultiTreeValue,
	AnyTree,
	SyncTree,
	TreeValue,
	Tree,
} from '../../types';
import {
	AsyncTraversalItem,
	MultiTraversalItem,
	AnyTraversalItem,
	SyncTraversalItem,
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
	treeRef: MultiTree<T>,
	value?: MultiTreeValue<T>,
): MultiTraversalItem<T>;
export function createTraversalItem<T>(
	key: string,
	level: number,
	parentRef: ChainedObject | undefined,
	treeRef: SyncTree<T>,
	value?: TreeValue<T>,
): SyncTraversalItem<T>;
export function createTraversalItem<T>(
	key: string,
	level: number,
	parentRef: ChainedObject | undefined,
	treeRef: AnyTree<T>,
	value?: TreeValue<T>,
): AnyTraversalItem<T>;
export function createTraversalItem<T>(
	key: string,
	level: number,
	parentRef: ChainedObject | undefined,
	treeRef: AnyTree<T>,
	value?: T,
): AnyTraversalItem<T> {
	return {
		key,
		parentRef,
		level,
		[valueSymbol]: value,
		[treeRefSymbol]: treeRef,
	};
}
