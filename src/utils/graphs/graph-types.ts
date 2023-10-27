import { ChainedObject, StorageTree, Tree } from 'src/types';

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

export interface AsyncTraversalItem<T> extends BaseTraversalItem<T> {
	[valueSymbol]: T | undefined;
	[treeRefSymbol]: StorageTree<T>;
}

export interface TraversalItem<T> extends BaseTraversalItem<T> {
	[treeRefSymbol]: Tree<T>;
}

export interface StorageTraversalItem<T> extends BaseTraversalItem<T> {
	[treeRefSymbol]: StorageTree<T>;
}
