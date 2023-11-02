import {
	ChainedObject,
	MultiTree,
	MultiTreeValue,
	AnyTree,
	TreeValue,
	Tree,
} from 'src/types';

export interface SimpleList<T> {
	push(item: T): unknown;
	pop(): T | undefined;
	length: number;
}

export const treeRefSymbol = Symbol('treeRef');
export const valueSymbol = Symbol('value');

export interface BaseTraversalItem<T> extends ChainedObject {
	[valueSymbol]: T | undefined;
	[treeRefSymbol]: object;
}

export interface AsyncTraversalItem<T> extends BaseTraversalItem<TreeValue<T>> {
	[treeRefSymbol]: AnyTree<T>;
}

export interface TraversalItem<T> extends BaseTraversalItem<T> {
	[treeRefSymbol]: Tree<T>;
}

export interface MultiTraversalItem<T>
	extends BaseTraversalItem<MultiTreeValue<T>> {
	[treeRefSymbol]: MultiTree<T>;
}

export type SyncTraversalItem<T> = TraversalItem<T> | MultiTraversalItem<T>;
export type AnyTraversalItem<T> = SyncTraversalItem<T> | AsyncTraversalItem<T>;
