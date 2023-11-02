import { isAsyncIterable } from '@codibre/fluent-iterable';
import { MergedOptions } from './options-types';
import {
	AsyncTree,
	AsyncTreeChildren,
	KeyTreeCacheStorage,
	TreeKeys,
	TreeValue,
} from './types';
import { createTraversalItem } from './utils/graphs';
import { buildKey } from './utils/graphs/build-key';
import { AnyTraversalItem, valueSymbol } from './utils/graphs/graph-types';
import { MultiTreeRef } from './multi-tree-ref';
import {
	getMultiValueFromAsyncIterable,
	getReadStorageFunction,
	getTreeListFromAsyncIterable,
	isUndefined,
} from './utils';

export class AsyncTreeRef<R> implements AsyncTree<R> {
	[TreeKeys.value]?: TreeValue<R>;
	constructor(
		private nodeRef: AnyTraversalItem<R> | undefined,
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
		const get = getReadStorageFunction(this.storage);
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
				const value = await get(buildKey(traversalItem));
				if (level < this.options.keyLevelNodes) {
					traversalItem[valueSymbol] = isAsyncIterable(value)
						? await getMultiValueFromAsyncIterable(value)
						: value;
					yield [
						item,
						new AsyncTreeRef(traversalItem, this.storage, this.options),
					];
				} else if (!isUndefined(value)) {
					if (level > this.options.keyLevelNodes) {
						throw new Error('Something went wrong');
					}
					const tree = !isAsyncIterable(value)
						? this.options.treeSerializer.deserialize(value)
						: new MultiTreeRef<R>(
								traversalItem,
								await getMultiValueFromAsyncIterable(value),
								await getTreeListFromAsyncIterable(
									this.options.treeSerializer,
									value,
								),
						  );
					yield [item, tree];
				}
			}
		}
	}
}
