export type KeyType = string;
export type TreeChildren<T> = {
	[t in KeyType]: Tree<T> | undefined;
};
export type AsyncTreeChildren<T> = AsyncIterable<[KeyType, AnyTree<T>]>;
export type MultiTreeChildren<T> = {
	[t in KeyType]: MultiTree<T> | undefined;
};

export enum TreeKeys {
	children = 'c',
	value = 'v',
	deadline = 'd',
}

export interface BaseTree<T> {
	[TreeKeys.value]?: T;
	[TreeKeys.children]?: object;
}

export type TreeValue<T> = T | MultiTreeValue<T>;

export interface AsyncTree<T> extends BaseTree<TreeValue<T>> {
	[TreeKeys.children]?: () => AsyncTreeChildren<T>;
}

export const multiTreeValue = Symbol('multiTreeValue');

export interface MultiTreeValue<T> {
	[multiTreeValue]: T[];
}

export interface MultiTree<T> extends BaseTree<MultiTreeValue<T>> {
	[TreeKeys.children]?: MultiTreeChildren<T>;
	[TreeKeys.deadline]?: number;
}

export interface Tree<T> extends BaseTree<T> {
	[TreeKeys.children]?: TreeChildren<T>;
	[TreeKeys.deadline]?: number;
}

export type SyncTree<T> = Tree<T> | MultiTree<T>;
export type AnyTree<T> = SyncTree<T> | AsyncTree<T>;

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
