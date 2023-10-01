export interface KeyTreeCacheStorage<R = string> {
	get(key: string): Promise<R | undefined> | R | undefined;
	set(key: string, value: R, ttl?: number): Promise<unknown> | unknown;
}
