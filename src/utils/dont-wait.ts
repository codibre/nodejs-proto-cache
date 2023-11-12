/**
 * Puts an async operation to be executed in the next tick,
 * ignoring any erros to avoid shutting down the application
 * @param callback The async callback to be executed
 */
export function dontWait(callback?: () => Promise<unknown>) {
	if (!callback) return;
	setImmediate(async () => {
		try {
			await callback();
		} catch {
			// ignore
		}
	});
}
