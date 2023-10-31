export type KeyType = string;
export type TreeChildren<T> = {
	[t in KeyType]: Tree<T> | undefined;
};
export type AsyncTreeChildren<T> = AsyncIterable<
	[KeyType, AsyncTree<T> | Tree<T>]
>;

export enum TreeKeys {
	children = 'c',
	value = 'v',
	deadline = 'd',
}

export interface BaseTree<T> {
	[TreeKeys.value]?: T;
	[TreeKeys.children]?: object;
}

export interface AsyncTree<T> extends BaseTree<T> {
	[TreeKeys.children]?: () => AsyncTreeChildren<T>;
}

export interface Tree<T> extends BaseTree<T> {
	[TreeKeys.children]?: TreeChildren<T>;
	[TreeKeys.deadline]?: number;
}

export type StorageTree<T> = Tree<T> | AsyncTree<T>;

export interface Step<T> {
	value: T | undefined;
	key: string;
	level: number;
	nodeRef: ChainedObject;
}

export interface IterateStep<T> extends Step<T> {
	value: T;
}

export interface FullSetItem<T> extends Step<T> {
	oldValue: T | undefined;
}

export interface ChainedObject {
	key: string;
	level: number;
	parentRef?: ChainedObject;
}
