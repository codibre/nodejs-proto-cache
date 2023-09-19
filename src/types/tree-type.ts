export type KeyType = string | number | symbol;
export type TreeChildren<T> = {
	[t in KeyType]: Tree<T>;
};

export enum TreeKeys {
	children = 'c',
	value = 'v',
}

export interface Tree<T> {
	[TreeKeys.children]?: TreeChildren<T>;
	[TreeKeys.value]?: T;
}

export interface Step<T> {
	value: T | undefined;
	key: string;
	level: number;
	nodeRef: ChainedObject;
}

export interface IterateStep<T> extends Step<T> {
	value: T;
}

export interface FullSetItem<T> {
	value: T | undefined;
	oldValue: T | undefined;
	key: string;
	level: number;
}

export interface ChainedObject {
	key: string;
	level: number;
	parentRef?: ChainedObject;
}
