import { Tree } from './tree-type';

export interface Semaphore {
	acquire(key: string): Promise<() => Promise<unknown>>;
}

export interface Serializer<A, B> {
	serialize(a: A): B;
	deserialize(b: B): A;
}

export interface KeyTreeCacheOptions<T, R = string>
	extends Partial<Serializer<T, R>> {
	keyLevelNodes: number;
	treeSerializer?: Serializer<Tree<R>, R>;
	semaphore?: Semaphore;
}
