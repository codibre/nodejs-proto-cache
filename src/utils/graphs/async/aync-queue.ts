import {
	AsyncSimpleList,
	Node,
	isAsyncIterable,
	isAsyncIterator,
} from './async-struct-helper';

export class AsyncQueue<T> implements AsyncSimpleList<T> {
	private next: Node<T | AsyncIterator<T>> | undefined;
	private last: Node<T | AsyncIterator<T>> | undefined;
	private size = 0;

	private removeNode() {
		if (this.next) {
			this.next = this.next.next;
			if (!this.next) {
				this.last = undefined;
			}
		}
	}
	private async asyncNext(value: AsyncIterator<T>) {
		const item = await value.next();
		if (item.done) {
			this.removeNode();
			return this.pop();
		}
		return item.value;
	}

	get length() {
		return this.size;
	}

	push(value: T | AsyncIterable<T>) {
		const treated = isAsyncIterable(value)
			? value[Symbol.asyncIterator]()
			: value;
		const node = { value: treated };
		if (this.last) {
			this.last = this.last.next = node;
		} else {
			this.last = this.next = node;
		}
		this.size++;
	}

	pop(): Promise<T | undefined> | T | undefined {
		const { next } = this;
		if (next) {
			const { value } = next;
			if (isAsyncIterator(value)) {
				return this.asyncNext(value);
			}
			this.removeNode();
			this.size--;
			return value;
		}
	}
}
