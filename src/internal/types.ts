import { FluentAsyncIterable } from '@codibre/fluent-iterable';
import { AsyncTree, ChainedObject, SyncTree, TreeValue } from '../types';
import {
	MultiTraversalItem,
	AnyTraversalItem,
	TraversalItem,
	SyncTraversalItem,
} from '../utils/graphs/graph-types';

/**
 * Represented a serialized value in any of the current supported formats
 * The serialize value can be an Async Iterable of serialized values, when
 * we're reading key level node values of a history, so the storage can
 * return them without loading all to memory at once.
 * Also, it can be an array of serialized values, for when we're processing a saved tree,
 * as we can avoid loading the current node history values to memory because we also
 * have to know its children at the same time.
 * Finally, it can be a single serialized value, when we're using this library
 * without history support
 */
export type SerializedValue<R> = AsyncIterable<R | undefined> | TreeValue<R>;

/**
 * This type represents async every traversal function available, ie,
 * * async pre order bfs
 * * async post order bfs
 * * async pre order dfs
 * * async post order dfs
 * No matter the async traversal function, it must follow this contract
 */
export type AsyncTraversalFunction<R> = (
	tree: AsyncTree<R>,
	parentRef: ChainedObject | undefined,
) => AsyncIterable<AnyTraversalItem<R>>;

/**
 * This type represents sync every traversal function available, ie,
 * * sync pre order bfs
 * * sync post order bfs
 * * sync pre order dfs
 * * sync post order dfs
 * No matter the sync traversal function, it must follow this contract
 */
export type SyncTraversalFunction<R> = (
	tree: SyncTree<R>,
	parentRef: ChainedObject | undefined,
) => Iterable<TraversalItem<R> | MultiTraversalItem<R>>;

/**
 * Represents a randomIterate Iterable result
 * that can be async, when the path provided is key level,
 * or sync, when the path provided is tree level
 */
export type InternalRandomIterable<R> =
	| FluentAsyncIterable<SyncTraversalItem<R>>
	| FluentAsyncIterable<TraversalItem<R>>;

export const MILLISECOND_SCALE = 1000;
