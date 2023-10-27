import { KeyTreeCacheOptions } from './types';

export type MergedOptions<T, R> = DefaultOptions<T, R> &
	KeyTreeCacheOptions<T, R>;
export type DefaultOptions<T, R> = Required<
	Omit<KeyTreeCacheOptions<T, R>, 'keyLevelNodes' | 'memoizer'>
>;
