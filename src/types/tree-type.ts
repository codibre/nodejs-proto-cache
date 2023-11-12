/**
 * Supported key types
 */
export type KeyType = string;
/**
 * A Simple Tree children interface
 */
export type TreeChildren<T> = {
	[t in KeyType]: Tree<T> | undefined;
};
/**
 * An Async Tree children interface
 */
export type AsyncTreeChildren<T> = AsyncIterable<[KeyType, AnyTree<T>]>;
/**
 * A MultiTree children interface
 */
export type MultiTreeChildren<T> = {
	[t in KeyType]: MultiTree<T> | undefined;
};

/**
 * Enum with the the tree supported fields
 */
export enum TreeKeys {
	children = 'c',
	value = 'v',
	deadline = 'd',
}

/**
 * A Base Tree, representing any type of supported
 */
export interface BaseTree<T> {
	[TreeKeys.value]?: T;
	[TreeKeys.deadline]?: number;
	[TreeKeys.children]?: object;
}

/**
 * A TreeValue, that can be a single one, or a list of many in case of node history support
 */
export type TreeValue<T> = T | MultiTreeValue<T>;

/**
 * A AsyncTree, representing a level key tree reference
 */
export interface AsyncTree<T> extends BaseTree<TreeValue<T>> {
	[TreeKeys.children]?: () => AsyncTreeChildren<T>;
}

/**
 * A symbol for MultiTreeValue deserialization
 * It used so the library can see the difference between an array
 * serialized value from a MultiTreeSerialize value
 */
export const multiTreeValue = Symbol('multiTreeValue');

/**
 * Represents a MultiTreeValue
 * It used so the library can see the difference between an array
 * serialized value from a MultiTreeSerialize value
 */
export interface MultiTreeValue<T> {
	[multiTreeValue]: T[];
}

/**
 * A tree level Tree with history support
 */
export interface MultiTree<T> extends BaseTree<MultiTreeValue<T>> {
	[TreeKeys.children]?: MultiTreeChildren<T>;
}

/**
 * A simple tree level Tree
 */
export interface Tree<T> extends BaseTree<T> {
	[TreeKeys.children]?: TreeChildren<T>;
}

/**
 * Any type of tree level Tree (with and without history support)
 */
export type SyncTree<T> = Tree<T> | MultiTree<T>;

/**
 * Any supported tree type
 */
export type AnyTree<T> = SyncTree<T> | AsyncTree<T>;

/**
 * A traverse step, yielded by any kind of traversal method
 */
export interface Step<T> {
	value: T | undefined;
	key: string;
	level: number;
	nodeRef: ChainedObject;
}

/**
 * an IteratePath traversal step, where the value if guaranteed to be filled
 */
export interface IterateStep<T> extends Step<T> {
	value: T;
}

/**
 * Represents a Step used during persistence operations
 */
export interface FullSetItem<R, T> extends Step<T> {
	oldValue: T | undefined;
	currentSerialized: TreeValue<R> | undefined;
}

/**
 * Chained objects representing the path to the current node
 */
export interface ChainedObject {
	key: string;
	level: number;
	parentRef?: ChainedObject;
}

/**
 * A function to retrieve the ttl for a given step, or the ttl itself
 */
export type StepTtl<T> = ((t: Step<T>) => number | undefined) | number;
