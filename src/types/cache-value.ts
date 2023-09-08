export interface CacheSubItem {
	key: string;
	value?: string;
	subItems?: CacheSubItem[];
}

export interface CacheItem {
	value?: string;
	subItems?: CacheSubItem[];
}
