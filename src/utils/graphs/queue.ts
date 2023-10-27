interface Node<T> {
	value?: T;
	last?: Node<T>;
	next?: Node<T>;
}

export class Queue<T> {
	private next: Node<T> | undefined;
	private last: Node<T> | undefined;
	private size = 0;

	get length() {
		return this.size;
	}
	push(value: T) {
		const node = { value };
		if (this.last) {
			this.last = this.last.next = node;
		} else {
			this.last = this.next = node;
		}
		this.size++;
	}
	peek() {
		return this.next?.value;
	}
	pop() {
		if (this.next) {
			const { value } = this.next;
			this.next = this.next.next;
			if (!this.next) {
				this.last = undefined;
			}
			this.size--;
			return value;
		}
	}
}
