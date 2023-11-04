import { isAsyncIterable } from '@codibre/fluent-iterable';
import { AsyncSimpleList } from './async-struct-helper';

export class AsyncStack<T> implements AsyncSimpleList<T> {
	private stack: Array<T> = [];

	push(value: T | AsyncIterable<T>) {
		if (isAsyncIterable(value)) {
			return this.addIterable(value);
		}
		this.stack.push(value);
	}

	private async addIterable(value: AsyncIterable<T>) {
		for await (const item of value) {
			this.stack.push(item);
		}
	}

	get length() {
		return this.stack.length;
	}

	pop(): T | undefined {
		return this.stack.pop();
	}
}
