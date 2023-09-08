import { getKey } from './get-key';

export function getChainedKey(keys: string[], index: number, prevKeys: string) {
	const key = getKey(keys, index);
	const chainedKey = prevKeys ? `${prevKeys}:${key}` : key;
	prevKeys = chainedKey;
	return { chainedKey, key, prevKeys };
}
