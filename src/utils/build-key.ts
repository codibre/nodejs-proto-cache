import { ChainedObject } from 'src/types';

/**
 * Builds a chained key using a ChainedObject or an array of keys
 * @param nodeRef The chainedObject or the array of keys
 * @returns the chained key
 */
export function buildKey<T extends ChainedObject>(nodeRef: T | string[]) {
	if (Array.isArray(nodeRef)) {
		return nodeRef.join(':');
	}
	const keys: string[] = [nodeRef.key];
	let parent = nodeRef.parentRef;
	while (parent) {
		keys.push(parent.key);
		parent = parent.parentRef;
	}
	return keys.reverse().join(':');
}

export function splitKey(key: string) {
	return key.split(':');
}
