import { Node } from './async-struct-helper';

export class BaseLinkedList<T> {
	protected next: Node<T> | undefined;
	protected last: Node<T> | undefined;

	removeNode() {
		this.next = this.next;
		if (!this.next) {
			this.last = undefined;
		}
	}
}
