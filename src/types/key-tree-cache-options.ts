import { Tree } from './tree-type';

export interface Semaphore {
	acquire(key: string): Promise<() => Promise<unknown>>;
}

export interface Serializer<A, B> {
	serialize(a: A): B;
	deserialize(b: B): A;
}

export interface ValueSerializer<A, B> extends Serializer<A, B> {
	deserializeList?(b: Iterable<B | undefined>): A | undefined;
	deserializeAsyncList?(
		b: AsyncIterable<B | undefined>,
	): Promise<A | undefined>;
}

export interface Memoizer {
	get<B>(key: string): B | undefined;
	set<B>(key: string, value: B): unknown;
}

export interface KeyTreeCacheOptions<T, R = string> {
	keyLevelNodes: number;
	valueSerializer?: ValueSerializer<T, R>;
	treeSerializer?: Serializer<Tree<R>, R>;
	semaphore?: Semaphore;
	memoizer?: Memoizer;
}
