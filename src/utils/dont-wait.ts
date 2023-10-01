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
