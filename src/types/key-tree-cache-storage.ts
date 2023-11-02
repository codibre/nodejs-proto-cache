export interface KeyTreeCacheStorage<R = string> {
	clearAllChildrenRegistry?(): Promise<void>;
	get(key: string): Promise<R | undefined> | R | undefined;
	getVersions?(key: string): AsyncIterable<R | undefined>;
	set(key: string, value: R, ttl?: number): Promise<unknown> | unknown;
	getChildren?(key?: string): AsyncIterable<string>;
	getCurrentTtl(key: string): Promise<number | undefined> | number | undefined;
	randomIterate?(pattern?: string): AsyncIterable<string>;
	registerChild?(
		parentKey: string | undefined,
		partialKey: string,
	): Promise<unknown>;
}
