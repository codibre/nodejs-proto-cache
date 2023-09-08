export interface KeyTreeCacheStorage {
	get(key: string): Promise<string | undefined> | string | undefined;
	set(key: string, value: string): Promise<unknown> | unknown;
}
