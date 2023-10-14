export type KeyType = string | number | symbol;
export type TreeChildren<T> = {
	[t in KeyType]: Tree<T>;
};

export enum TreeKeys {
	children = 'c',
	value = 'v',
	deadline = 'd',
}

export interface Tree<T> {
	[TreeKeys.children]?: TreeChildren<T>;
	[TreeKeys.value]?: T;
	[TreeKeys.deadline]?: number;
}

export interface Step<T> {
	value: T | undefined;
	key: string;
	level: number;
	nodeRef: ChainedObject;
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
