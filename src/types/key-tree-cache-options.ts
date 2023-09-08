export interface KeyTreeCacheOptions<T> {
	keyLevelNodes: number;
	serialize?(payload: T): string;
	deserialize?(stringified: string): T;
}
