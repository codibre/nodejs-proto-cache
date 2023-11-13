import { Step, StepTtl } from 'src/types';

/**
 * Return the current and max ttl based on current information
 * This functions is needed because we need to guarantee that
 * when saving a whole tree into the storage, its key ttl will be
 * the max ttl of all its nodes
 * @param ttl The ttl value of function to retrieve it
 * @param step The current step
 * @param maxTtl The current maxTtl
 * @returns currentTtl: the ttl for the given step. maxTtl: the new max ttl
 */
export function getTtl<T>(
	ttl: StepTtl<T> | undefined,
	step: Step<T>,
	maxTtl: number | undefined,
) {
	const currentTtl = typeof ttl === 'function' ? ttl(step) : ttl;
	if (currentTtl && (!maxTtl || currentTtl > maxTtl)) {
		maxTtl = currentTtl;
	}
	return { currentTtl, maxTtl };
}
