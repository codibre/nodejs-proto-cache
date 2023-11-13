import { KeyTreeCacheOptions } from '../types';

/**
 * Defaults Options is an interface that Requires
 * every Optional field of Options
 */
export type DefaultOptions<T, R> = Required<
	Omit<KeyTreeCacheOptions<T, R>, 'keyLevelNodes' | 'memoizer'>
>;

/**
 * MergedOptions is an Options where all the fields
 * are required. It represents the option when it is saved
 * and set into the instance
 */
export type MergedOptions<T, R> = DefaultOptions<T, R> &
	KeyTreeCacheOptions<T, R>;
