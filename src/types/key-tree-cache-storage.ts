export interface KeyTreeCacheStorage<R = string> {
	/**
	 * Clear all the current key children registered
	 */
	clearAllChildrenRegistry?(): Promise<void>;
	/**
	 * Returns the value for the given key
	 * @param key The key to be looked up for
	 */
	get(key: string): Promise<R | undefined> | R | undefined;
	/**
	 * Returns all the non expired values registered for the given key.
	 * This is useful if you want to have a processed value based on
	 * the latest history items. In that case, the saving fashion
	 * must be controlled by the set method implementation
	 * @param key Re
	 */
	getHistory?(key: string): AsyncIterable<R | undefined>;
	/**
	 * Saves the given value into the given key, with the given ttl, if informed
	 * @param key The key where the value will be persisted
	 * @param value The value to be saved
	 * @param ttl Optional. The ttl os the value, in seconds
	 */
	set(key: string, value: R, ttl?: number): Promise<unknown> | unknown;
	/**
	 * Returns all the children of a given key. To be used with key level keys
	 * @param key The parent key
	 */
	getChildren?(key?: string): AsyncIterable<string>;
	/**
	 * Returns the current ttl of the given key
	 * @param key The key
	 */
	getCurrentTtl(key: string): Promise<number | undefined> | number | undefined;
	/**
	 * Returns an async iterable that yields all the keys that matches the given pattern
	 * @param pattern The pattern to match the keys. If not informed, all keys are returned
	 */
	randomIterate?(pattern?: string): AsyncIterable<string>;
	/**
	 * Register a child for a given key
	 * @param parentKey the parent chained key (in the buildKey return format)
	 * @param partialKey The child key (not chained)
	 */
	registerChild?(
		parentKey: string | undefined,
		partialKey: string,
	): Promise<unknown>;
}
