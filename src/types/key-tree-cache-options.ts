import { Tree } from './tree-type';

/**
 * A Semaphore contract, whenever it is necessary to enforce safe storage update
 */
export interface Semaphore {
	acquire(key: string): Promise<() => Promise<unknown>>;
}

/**
 * A base Serializer interface
 */
export interface Serializer<A, B> {
	/**
	 * Serializes a value from type A to B
	 * @param a the instance of type A
	 */
	serialize(a: A): B;
	/**
	 * Deserializes a value from type B to A
	 * @param b the instance of type B
	 */
	deserialize(b: B): A;
}

/**
 * A ValueSerializer, for node values
 */
export interface ValueSerializer<A, B> extends Serializer<A, B> {
	/**
	 * Optional, whenever node history support is needed.
	 * Deserializes an iterable of instances of B into a single instance of A
	 * For example, you can use it to retrieve the average of a history of numbers
	 * @param bList A list o
	 */
	deserializeList?(bList: Iterable<B | undefined>): A | undefined;
	/**
	 * Optional, whenever node history support is needed.
	 * Deserializes an async iterable of instances of B into a single instance of A
	 * For example, you can use it to retrieve the average of a history of numbers
	 * @param bList A list o
	 */
	deserializeAsyncList?(
		b: AsyncIterable<B | undefined>,
	): Promise<A | undefined>;
}

/**
 * An interface for Tree Serialization
 */
export interface TreeSerializer<B> extends Serializer<Tree<B>, B> {}

/**
 * An interface for memoization of storage values, used during
 * read-only operations. Implement this interface if you have
 * big values being saved in your persistence and you want to avoid
 * Reading them twice during some operation.
 * Be aware that the context of the memoization is up to you to control.
 * Suggestion: use async hooks to enclose a request scope context
 */
export interface Memoizer {
	get<B>(key: string): B | undefined;
	set<B>(key: string, value: B): unknown;
}

/**
 * The options to create your TreeKeyCache instance
 */
export interface KeyTreeCacheOptions<T, R = string> {
	/**
	 * The key level node, ie, in which tree level the storage
	 * will start to the whole sub-tree.
	 * Think carefully in your tree building to guarantee that
	 * the size of the sub-tree from that point will not be
	 * big enough to cause memory troubles, as the library
	 * loads the whole tree to memory during operations involving
	 * it, although we avoid loading two saved sub-tree at the same time
	 * in the same operation call
	 */
	keyLevelNodes: number;
	/**
	 * The instance of the valueSerializer. If not informed, a default
	 * instance implemented with JSON will be used with no history support
	 */
	valueSerializer?: ValueSerializer<T, R>;
	/**
	 * The instance of the treeSerializer. If not informed, a default
	 * instance implemented with JSON will be used
	 */
	treeSerializer?: TreeSerializer<R>;
	/**
	 * The Semaphore instance, if you want the guarantee safe persistence
	 */
	semaphore?: Semaphore;
	/**
	 * The memoizer instance, if you want to avoid reading the same key
	 * twice in the same memoizer context
	 */
	memoizer?: Memoizer;
}
