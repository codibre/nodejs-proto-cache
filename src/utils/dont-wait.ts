export function dontWait(callback: () => Promise<unknown>) {
	setImmediate(async () => {
		try {
			await callback();
		} catch {
			// ignore
		}
	});
}
