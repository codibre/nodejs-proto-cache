import { Memoizer } from 'src/types';
import { isUndefinedOrNull } from './is-undefined';

async function runAndMemoize<Args extends unknown[], T>(
	memoizer: Memoizer,
	key: string,
	args: Args,
	callback: (key: string, ...args: Args) => Promise<T>,
) {
	const result = await callback(key, ...args);
	if (!isUndefinedOrNull(result)) {
		memoizer.set(key, result);
	}
	return result;
}

/**
 * Returns a memoizable version of the callback
 * or the callback itself, when memoizer is undefined
 * @param memoizer The memoizer to be used, or undefined
 * @param callback the callback to be memoized
 */
export function getMemoized<Args extends unknown[], T>(
	memoizer: Memoizer | undefined,
	callback: (chainedKey: string, ...args: Args) => Promise<T>,
): (key: string, ...args: Args) => Promise<T | undefined> | T | undefined {
	return memoizer
		? (key: string, ...args: Args) => {
				const result = memoizer.get<T>(key);
				return isUndefinedOrNull(result)
					? runAndMemoize(memoizer, key, args, callback)
					: result;
		  }
		: callback;
}
