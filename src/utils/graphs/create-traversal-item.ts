import { getTreeCurrentSerializedValue } from 'src/internal';
import {
	AsyncTree,
	ChainedObject,
	MultiTree,
	AnyTree,
	SyncTree,
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
	now: number,
): TraversalItem<T>;
export function createTraversalItem<T>(
	key: string,
	level: number,
	parentRef: ChainedObject | undefined,
	treeRef: AsyncTree<T>,
	now: number,
): AsyncTraversalItem<T>;
export function createTraversalItem<T>(
	key: string,
	level: number,
	parentRef: ChainedObject | undefined,
	treeRef: MultiTree<T>,
	now: number,
): MultiTraversalItem<T>;
export function createTraversalItem<T>(
	key: string,
	level: number,
	parentRef: ChainedObject | undefined,
	treeRef: SyncTree<T>,
	now: number,
): SyncTraversalItem<T>;
export function createTraversalItem<T>(
	key: string,
	level: number,
	parentRef: ChainedObject | undefined,
	treeRef: AnyTree<T>,
	now: number,
): AnyTraversalItem<T>;
export function createTraversalItem<T>(
	key: string,
	level: number,
	parentRef: ChainedObject | undefined,
	treeRef: AnyTree<T>,
	now: number,
): AnyTraversalItem<T> {
	return {
		key,
		parentRef,
		level,
		[valueSymbol]: getTreeCurrentSerializedValue(treeRef, now),
		[treeRefSymbol]: treeRef,
	};
}
