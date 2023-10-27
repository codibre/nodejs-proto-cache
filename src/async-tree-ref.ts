import { MergedOptions } from './options-types';
import {
	AsyncTree,
	AsyncTreeChildren,
	KeyTreeCacheStorage,
	TreeKeys,
} from './types';
import { createTraversalItem } from './utils/graphs';
import { buildKey } from './utils/graphs/build-key';
import { StorageTraversalItem, valueSymbol } from './utils/graphs/graph-types';

export class AsyncTreeRef<R> implements AsyncTree<R> {
	[TreeKeys.value]?: R;
	constructor(
		private nodeRef: StorageTraversalItem<R> | undefined,
		private storage: KeyTreeCacheStorage<R>,
		private options: MergedOptions<unknown, R>,
	) {
		this[TreeKeys.value] = nodeRef?.[valueSymbol];
	}
	async *[TreeKeys.children](): AsyncTreeChildren<R> {
		if (!this.storage.getChildren) {
			throw new TypeError(
				'This storage does not support DFS or BFS on key level nodes',
			);
		}
		let iterable: AsyncIterable<string>;
		let startLevel: number;
		if (this.nodeRef) {
			startLevel = this.nodeRef.level;
			iterable = this.storage.getChildren(buildKey(this.nodeRef));
		} else {
			startLevel = 0;
			iterable = this.storage.getChildren();
		}
		if (iterable) {
			const level = startLevel + 1;
			for await (const item of iterable) {
				const traversalItem = createTraversalItem(
					item,
					level,
					this.nodeRef,
					this,
				);
				const value = await this.storage.get(buildKey(traversalItem));
				traversalItem[valueSymbol] = value;
				if (level < this.options.keyLevelNodes) {
					yield [
						item,
						new AsyncTreeRef(traversalItem, this.storage, this.options),
					];
				} else if (value) {
					if (level === this.options.keyLevelNodes) {
						const tree = this.options.treeSerializer.deserialize(value);
						yield [item, tree];
					} else {
						throw new Error('Something went wrong');
					}
				}
			}
		}
	}
}
