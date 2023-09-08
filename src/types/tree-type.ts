export type KeyType = string | number | symbol;
export type TreeChildren<T> = {
	[t in KeyType]: Tree<T>;
};

export interface Tree<T> {
	c?: TreeChildren<T>;
	v?: T;
}

export interface Step<T> {
	value: T;
	key: string;
	level: number;
}

export interface FullSetItem<T> {
	value: T | undefined;
	oldValue: T | undefined;
	key: string;
	level: number;
}
