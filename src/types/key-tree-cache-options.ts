export interface Semaphore {
	acquire(key: string): Promise<() => Promise<unknown>>;
}

export interface KeyTreeCacheOptions<T> {
	keyLevelNodes: number;
	serialize?(payload: T): string;
	deserialize?(stringified: string): T;
	semaphore?: Semaphore;
}
