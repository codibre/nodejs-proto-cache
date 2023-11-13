import { isUndefinedOrNull } from './is-undefined';

/**
 * Returns the value of the current level key or throws
 * an error whether the level or the key position is invalid
 * @param keys The list of keys
 * @param level the current level
 */
export function getKey(keys: string[], level: number) {
	const key = keys[level];
	if (isUndefinedOrNull(key)) {
		throw new TypeError(`Undefined key at position ${level}`);
	}
	return key;
}
