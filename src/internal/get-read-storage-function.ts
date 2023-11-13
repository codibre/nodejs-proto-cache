import { KeyTreeCacheStorage } from 'src/types';

/**
 * Selects the proper read only method to use from the storage
 * If the storage have getHistory implemented, we must prefer it over the simple get
 * For read-only operations
 * @param storage The storage implementation
 * @returns The appropriate bound method
 */
export function getReadStorageFunction<R>(storage: KeyTreeCacheStorage<R>) {
	return storage.getHistory?.bind(storage) ?? storage.get.bind(storage);
}
