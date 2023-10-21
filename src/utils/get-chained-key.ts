import { getKey } from './get-key';

export function getChainedKey(
	keys: string[],
	index: number,
	chainedKey: string | undefined,
) {
	const key = getKey(keys, index);
	chainedKey = chainedKey ? `${chainedKey}:${key}` : key;
	return { chainedKey, key };
}
