export interface KeyTreeCacheStorage<R = string> {
	get(key: string): Promise<R | undefined> | R | undefined;
	set(key: string, value: R): Promise<unknown> | unknown;
}
