import { getKey } from './get-key';

/**
 * Returns the concatenation the current key with the previous ones, building a deeper key at each call
 * @param keys the list with all keys
 * @param level the current level
 * @param chainedKey The previous chainedKey
 */
export function getChainedKey(
	keys: string[],
	level: number,
	chainedKey: string | undefined,
) {
	const key = getKey(keys, level);
	chainedKey = chainedKey ? `${chainedKey}:${key}` : key;
	return { chainedKey, key };
}
