/**
 * A type guard for whenever we want to make sure a value is not undefined nor null
 * @param value the value to be analyzed
 * @returns Returns if the value is undefined or null
 */
export function isUndefined<T>(
	value: T | undefined | null,
): value is undefined | null {
	return value === undefined || value === null;
}
