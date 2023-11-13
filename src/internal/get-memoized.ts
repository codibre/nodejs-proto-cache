import { Memoizer } from 'src/types';
import { isUndefined } from './is-undefined';

async function runAndMemoize<Args extends unknown[], T>(
	memoizer: Memoizer,
	key: string,
	args: Args,
	callback: (key: string, ...args: Args) => Promise<T>,
) {
	const result = await callback(key, ...args);
	if (!isUndefined(result)) {
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
	callback: (key: string, ...args: Args) => Promise<T>,
): (key: string, ...args: Args) => Promise<T | undefined> | T | undefined {
	if (!memoizer) return callback;
	return (key: string, ...args: Args) => {
		const result = memoizer.get<T>(key);
		if (isUndefined(result)) {
			return runAndMemoize(memoizer, key, args, callback);
		}
		return result;
	};
}
