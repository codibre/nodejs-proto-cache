interface Node<T> {
	value?: T;
	last?: Node<T>;
	next?: Node<T>;
}

export function getQueue<T>() {
	const queue: Node<T> = {};
	let size = 0;
	return {
		get length() {
			return size;
		},
		push(value: T) {
			const node = { value };
			if (queue.last) {
				queue.last = queue.last.next = node;
			} else {
				queue.last = queue.next = node;
			}
			size++;
		},
		pop() {
			if (queue.next) {
				const { value } = queue.next;
				queue.next = queue.next.next;
				if (!queue.next) {
					queue.last = undefined;
				}
				size--;
				return value;
			}
		},
	};
}
