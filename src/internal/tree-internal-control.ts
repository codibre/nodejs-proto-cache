import { EventEmitter } from 'events';
import {
	isPromise,
	isAsyncIterable,
	fluentAsync,
	identity,
	FluentAsyncIterable,
	fluent,
} from '@codibre/fluent-iterable';
import { buildKey, splitKey } from 'src/utils';
import {
	MultiTraversalItem,
	SyncTraversalItem,
	TraversalItem,
	treeRefSymbol,
	valueSymbol,
} from 'src/utils/graphs/graph-types';
import { MultiTreeRef } from './multi-tree-ref';
import { MergedOptions } from './options-types';
import {
	AsyncTraversalFunction,
	InternalRandomIterable,
	MILLISECOND_SCALE,
	SerializedValue,
	SyncTraversalFunction,
} from './types';
import { AsyncTreeRef } from './async-tree-ref';
import { getNextStorageNode } from './get-next-storage-node';
import {
	ChainedObject,
	FullSetItem,
	KeyTreeCacheStorage,
	MultiTree,
	MultiTreeValue,
	Step,
	StepTtl,
	SyncTree,
	Tree,
	TreeKeys,
	TreeValue,
	multiTreeValue,
} from 'src/types';
import {
	createTraversalItem,
	treePreOrderBreadthFirstSearch,
	treePreOrderDepthFirstSearch,
} from 'src/utils/graphs';
import { getNextTreeNode } from './get-next-tree-node';
import { getTreeCurrentSerializedValue } from './get-tree-current-serialized-value';
import { getTtl } from './get-ttl';
import { isUndefinedOrNull } from './is-undefined';
import { getReadStorageFunction } from './get-read-storage-function';

/**
 * An auxiliary class containing internal methods to be used
 * during tree operations
 */
export class TreeInternalControl<T, R> {
	constructor(
		private options: MergedOptions<T, R>,
		private emitter: EventEmitter,
		private storage: KeyTreeCacheStorage<R>,
	) {}

	/**
	 * returns a step instance for the given serialized value and node reference
	 * @param serializedValue the serialized value
	 * @param nodeRef The current node reference
	 * @param createValue a call back to initialize empty nodes. Optional
	 */
	getStep(
		serializedValue: SerializedValue<R> | undefined,
		nodeRef: ChainedObject,
		createValue?: (node: ChainedObject) => T | undefined,
	): Promise<Step<T>> | Step<T> {
		function mountStep(value: T | undefined): Step<T> {
			return { key: nodeRef.key, value, level: nodeRef.level, nodeRef };
		}
		if (isUndefinedOrNull(serializedValue)) {
			return mountStep(createValue?.(nodeRef));
		}
		const result = this.deserializeValue(serializedValue);

		return isPromise(result) ? result.then(mountStep) : mountStep(result);
	}

	/**
	 * A function the deserialize an async list of values. It exists
	 * so deserializeValue can use it when it needs to return a promise
	 * This functions requires deserializeAsyncList to be implemented
	 * on the valueSerializer
	 * @param serializedList the serialized list
	 * @returns The resultant value
	 */
	private async deserializeAsyncList(
		serializedList: AsyncIterable<R | undefined>,
	) {
		if (!this.options.valueSerializer.deserializeAsyncList) {
			throw new Error(
				'deserializeAsyncList is not implemented on valueSerializer',
			);
		}
		try {
			return await this.options.valueSerializer.deserializeAsyncList(
				serializedList,
			);
		} catch (error) {
			this.emitter.emit('deserializeError', error, 'value');
		}
	}

	/**
	 * A function the deserialize an async list of values. It exists
	 * so deserializeValue can use it when it needs the serialize an array of values
	 * This functions requires deserializeAsyncList to be implemented
	 * on the valueSerializer
	 * @param serializedList the serialized list
	 * @returns The resultant value
	 */
	private deserializeList(serialized: MultiTreeValue<R>) {
		if (!this.options.valueSerializer.deserializeList) {
			throw new Error('deserializeList is not implemented on valueSerializer');
		}
		try {
			return this.options.valueSerializer.deserializeList(
				serialized[multiTreeValue],
			);
		} catch (error) {
			this.emitter.emit('deserializeError', error, 'value');
		}
	}

	/**
	 * Deserializes a value
	 * @param serialized The value to be deserialized
	 * @returns The deserialized value, or a promise of it when needed
	 */
	deserializeValue(
		serialized: SerializedValue<R>,
	): Promise<T | undefined> | T | undefined {
		if (isAsyncIterable(serialized)) {
			return this.deserializeAsyncList(serialized);
		}

		if (
			serialized &&
			typeof serialized === 'object' &&
			multiTreeValue in serialized
		) {
			return this.deserializeList(serialized);
		}
		try {
			return this.options.valueSerializer.deserialize(serialized);
		} catch (error) {
			this.emitter.emit('deserializeError', error, 'value');
		}
	}

	/**
	 * Serializes a given value
	 * @param value the value to be serialized
	 * @returns The serialized value
	 */
	serializeValue(value: T) {
		return this.options.valueSerializer.serialize(value);
	}

	/**
	 * Deserializes a tree.
	 * It returns undefined if the tree showed up to be invalid
	 * and emits the deserializeError event
	 * @param serializedTree the serialized tree
	 * @returns The deserialized tree or undefined, when the serializedTree is invalid
	 */
	deserializeTree(serializedTree: R): Tree<R> | undefined {
		try {
			return this.options.treeSerializer.deserialize(serializedTree);
		} catch (error) {
			this.emitter.emit('deserializeError', error, 'tree');
		}
	}

	/**
	 * Deserializes a tee with history support
	 * @param list The async iterable with all the tree values
	 * @param nodeRef The current node reference
	 * @param now The reference to the current timestamp being used
	 * @returns A MultiTreeRef instance
	 */
	async deserializeTreeFromList(
		list: AsyncIterable<R | undefined>,
		nodeRef: MultiTraversalItem<R> | undefined,
		now: number,
	): Promise<MultiTree<R> | undefined> {
		try {
			const trees = await fluentAsync(list)
				.filter()
				.map((buffer) => this.options.treeSerializer.deserialize(buffer))
				.toArray();
			return new MultiTreeRef<R>(nodeRef, trees, now);
		} catch (error) {
			this.emitter.emit('deserializeError', error, 'tree');
		}
	}

	/**
	 * Serializes a given tree
	 * @param tree the tree to be serialize
	 * @returns The serialized tree
	 */
	serializeTree(tree: Tree<R>): R {
		return this.options.treeSerializer.serialize(tree);
	}

	/**
	 * Returns a traversal iterable of node references for the given traversal functions
	 * @param nodeRef The node reference
	 * @param getAsyncIterable The async traversal function
	 * @param getIterable The sync traversal function
	 * @returns An async iterable when nodeRef is key level, and a sync one when it is tree level
	 */
	getTraversalIterable(
		nodeRef: SyncTraversalItem<R> | undefined,
		getAsyncIterable: AsyncTraversalFunction<R>,
		getIterable: SyncTraversalFunction<R>,
	) {
		const now = Date.now();
		return nodeRef && this.options.keyLevelNodes <= nodeRef.level
			? getIterable(nodeRef[treeRefSymbol], nodeRef)
			: getAsyncIterable(
					new AsyncTreeRef(nodeRef, this.storage, this.options, now, this),
					nodeRef,
			  );
	}

	/**
	 * Returns directly the required node reference
	 * @param path The path to the node
	 * @param lastValue Wether only the last value of a history is required
	 * @returns The node reference
	 */
	async getNodeRef(
		path: string[],
		lastValue: boolean,
	): Promise<SyncTraversalItem<R> | undefined> {
		const { length } = path;
		const { keyLevelNodes } = this.options;
		const upTo = Math.min(keyLevelNodes, length);
		let nodeRef: SyncTraversalItem<R> | undefined;
		let chainedKey: string | undefined;
		const treeRef: Tree<R> = {};
		const now = Date.now();
		const get = getReadStorageFunction(this.storage);

		if (upTo > 0 && (!nodeRef || upTo > nodeRef.level)) {
			do {
				nodeRef = getNextStorageNode(
					path,
					nodeRef?.level ?? 0,
					nodeRef,
					treeRef,
					now,
				);
			} while (nodeRef.level < upTo);
		}

		if (nodeRef && length >= nodeRef.level) {
			chainedKey = buildKey(nodeRef);
			const buffer = await (lastValue
				? this.storage.get(chainedKey)
				: get(chainedKey));
			if (nodeRef.level < keyLevelNodes) {
				nodeRef[valueSymbol] = isAsyncIterable(buffer)
					? { [multiTreeValue]: await fluentAsync(buffer).filter().toArray() }
					: buffer;
			} else if (buffer) {
				let tree: SyncTree<R> | undefined;
				if (isAsyncIterable(buffer)) {
					tree = new MultiTreeRef(
						nodeRef,
						await fluentAsync(buffer)
							.filter()
							.map((buff) => this.options.treeSerializer.deserialize(buff))
							.toArray(),
						now,
					);
				} else {
					tree = this.options.treeSerializer.deserialize(buffer);
				}
				while (nodeRef && nodeRef.level < length && tree) {
					({ nodeRef, tree } = getNextTreeNode(
						path,
						nodeRef.level,
						tree,
						nodeRef,
						treeRef,
						now,
					));
				}
				if (tree) {
					if (nodeRef) {
						nodeRef = createTraversalItem<R>(
							nodeRef.key,
							nodeRef.level,
							nodeRef.parentRef,
							tree,
							now,
						);
					}
				}
			}
		}

		return nodeRef;
	}

	/**
	 * Returns a traversal iterable of steps for the given traversal functions
	 * @param getAsyncIterable The async traversal function
	 * @param getIterable The sync traversal function
	 * @param basePath The base path to reach de node where the traversal will start
	 * @returns An async iterable when nodeRef is key level, and a sync one when it is tree level
	 */
	getTraversalStepsIterable(
		getAsyncIterable: AsyncTraversalFunction<R>,
		getIterable: SyncTraversalFunction<R>,
		basePath: string[] | undefined,
	): AsyncIterable<Step<T>> {
		return fluentAsync([
			basePath ? this.getNodeRef(basePath, false) : undefined,
		])
			.map(identity)
			.takeWhile((nodeRef) => !basePath || nodeRef)
			.flatMap((nodeRef) =>
				this.getTraversalIterable(nodeRef, getAsyncIterable, getIterable),
			)
			.map(async (item) => {
				const value = item[valueSymbol];
				return this.getStep(value, item);
			});
	}

	/**
	 * Returns a traversal random iterable of node references for last values
	 * @param pattern The pattern to be passed to the storage
	 * @param iterateTreeLevel Whether it necessary to iterate tree level nodes
	 * @param lastValue true (it will return only last values)
	 */
	internalRandomIterate(
		pattern: string | undefined,
		iterateTreeLevel: boolean,
		lastValue: true,
	): FluentAsyncIterable<TraversalItem<R>>;

	/**
	 * Returns a traversal random iterable of node references
	 * @param pattern The pattern to be passed to the storage
	 * @param iterateTreeLevel Whether it necessary to iterate tree level nodes
	 * @param lastValue false (it may return node history if supported)
	 */
	internalRandomIterate(
		pattern: string | undefined,
		iterateTreeLevel: boolean,
		lastValue: false,
	): FluentAsyncIterable<SyncTraversalItem<R>>;
	internalRandomIterate(
		pattern: string | undefined,
		iterateTreeLevel: boolean,
		lastValue: boolean,
	): InternalRandomIterable<R> {
		if (!this.storage.randomIterate) {
			throw new TypeError(
				'Storage implementation does not support random iteration',
			);
		}
		return fluentAsync(this.storage.randomIterate(pattern))
			.map(splitKey)
			.map((x) => this.getNodeRef(x, lastValue))
			.filter()
			.flatMap((nodeRef) =>
				nodeRef.level < this.options.keyLevelNodes || !iterateTreeLevel
					? [nodeRef]
					: fluent(
							treePreOrderBreadthFirstSearch(nodeRef[treeRefSymbol], nodeRef),
					  ),
			);
	}

	/**
	 * Register all children of the given node
	 * @param node the parent traversal item
	 * @param chainedKey The chainedKey for the given traversal item
	 */
	async registerKeyLevelChildren(node: TraversalItem<T>, chainedKey: string) {
		if (this.storage.registerChild) {
			const children = node[treeRefSymbol][TreeKeys.children];
			if (children) {
				for (const key in children) {
					if (key in children) {
						await this.storage.registerChild(chainedKey, key);
					}
				}
			}
		}
	}

	/**
	 * Persists the given step
	 * @param step The step to be persisted
	 * @param currentSerialized the current serialized value to compare with the new one and check if a new saving is necessary
	 * @param chainedKey The chainedKey for the given step
	 * @param ttl The ttl or function to return the ttl for the given step
	 */
	async persistStep(
		step: Step<T>,
		currentSerialized: R | undefined,
		chainedKey: string,
		ttl: StepTtl<T> | undefined,
	) {
		if (!isUndefinedOrNull(step.value)) {
			const serialized = this.options.valueSerializer.serialize(step.value);
			if (currentSerialized !== serialized) {
				const { currentTtl } = getTtl(ttl, step, undefined);
				await this.storage.set(chainedKey, serialized, currentTtl);
			}
		}
	}

	/**
	 * Persist the given tree
	 * @param chainedKey the chained key for the given tree
	 * @param ttl The ttl to be applied for the tree
	 * @param tree The tree to be persisted
	 */
	async persistTree(
		chainedKey: string,
		ttl: number | undefined,
		tree: Tree<R>,
	) {
		let maxTtl: number | undefined;
		if (ttl) {
			const currentTtl = await this.storage.getCurrentTtl(chainedKey);
			maxTtl = currentTtl === undefined ? ttl : Math.max(currentTtl, ttl);
		}
		await this.storage.set(chainedKey, this.serializeTree(tree), maxTtl);
	}

	/**
	 * Returns a reference for the current item to be used during
	 * persistence operation
	 * @param currentTree The current tree
	 * @param breadthNode the current node reference
	 * @param now The current timestamp reference
	 * @returns
	 */
	private async getFullSetItem(
		currentTree: Tree<R>,
		breadthNode: TraversalItem<T>,
		now: number,
	) {
		const currentSerialized = getTreeCurrentSerializedValue(currentTree, now);
		const { level, key, parentRef } = breadthNode;
		const node: FullSetItem<R, T> = {
			oldValue: currentSerialized
				? await this.deserializeValue(currentSerialized)
				: undefined,
			value: breadthNode[valueSymbol],
			key,
			level,
			nodeRef: {
				key,
				level,
				parentRef,
			},
			currentSerialized,
		};
		return node;
	}

	/**
	 * Checks whether an item has been changed
	 * @param item The item reference to be checked
	 * @param currentTree the current tree
	 * @returns true if the item has been changed
	 */
	private checkFullSetItemChange(
		item: FullSetItem<R, T>,
		currentTree: Tree<R>,
	) {
		let changed = false;
		const { value, currentSerialized } = item;
		if (value !== undefined) {
			const serialized = this.options.valueSerializer.serialize(value);
			if (serialized !== currentSerialized) {
				currentTree[TreeKeys.value] = serialized;
				changed = true;
			}
		}
		return changed;
	}

	/**
	 * Executes the iteration to save a tree level key value
	 * @param breadthNode the current node reference
	 * @param chainedKey The chainedKey for the node reference
	 * @param createValue Callback to initialize a value, optional
	 * @param ttl The ttl or function that returns the ttl to be used
	 */
	async *saveFullTreeValue(
		breadthNode: TraversalItem<T>,
		chainedKey: string,
		createValue: ((node: ChainedObject) => T | undefined) | undefined,
		ttl: StepTtl<T> | undefined,
	): AsyncIterable<FullSetItem<R, T>> {
		const now = Date.now();
		const { [treeRefSymbol]: treeRef } = breadthNode;
		const serializedTree = await this.storage.get(chainedKey);
		const rootTree: Tree<R> = serializedTree
			? this.options.treeSerializer.deserialize(serializedTree)
			: {};
		let currentTree: Tree<R> | undefined = rootTree;
		const stack = [];
		let changed = false;
		let maxTtl: number | undefined;
		const baseLevel = breadthNode.level;
		for (const depthNode of treePreOrderDepthFirstSearch(
			treeRef,
			breadthNode,
		)) {
			const { level, key } = depthNode;
			const stackRef = level - baseLevel;
			if (stack.length < stackRef) {
				if (!currentTree) {
					throw new Error('Algorithm error');
				}
				currentTree[TreeKeys.children] ??= {};
				let next: Tree<R> | undefined = currentTree[TreeKeys.children][key];
				if (isUndefinedOrNull(next)) {
					next = currentTree[TreeKeys.children][key] = {};
					const value = createValue?.(depthNode);
					if (!isUndefinedOrNull(value)) {
						changed = true;
						next[TreeKeys.value] =
							this.options.valueSerializer.serialize(value);
					}
				}
				currentTree = next;
				stack.push(currentTree);
			} else {
				while (stack.length > stackRef && stack.length > 0) {
					currentTree = stack.pop() as Tree<R>;
				}
			}
			const item = await this.getFullSetItem(currentTree, depthNode, now);
			yield item;
			const itemChanged = this.checkFullSetItemChange(item, currentTree);
			if (itemChanged) {
				({ maxTtl } = getTtl(ttl, item, maxTtl));
			}
			changed = itemChanged || changed;
		}

		if (changed) {
			await this.persistTree(chainedKey, maxTtl, rootTree);
		}
	}

	/**
	 * Updates the value of the referenced tree node when it has been changed
	 * @param step The current step
	 * @param currentSerialized The current serialized value
	 * @param currentTree The current Tree of serialized values
	 * @param ttl The ttl or function to obtain the ttl for the current step
	 * @param now The current timestamp reference
	 * @param maxTtl The current maxTtl, to calculate the needed ttl of the whole tree
	 * @returns changed: true when a changed happened, maxTtl: the new Max ttl
	 */
	enrichTree(
		step: Step<T>,
		currentSerialized: TreeValue<R> | undefined,
		currentTree: Tree<R>,
		ttl: StepTtl<T> | undefined,
		now: number,
		maxTtl: number | undefined,
	) {
		let changed = false;
		if (!isUndefinedOrNull(step.value)) {
			const serialized = this.serializeValue(step.value);
			if (currentSerialized !== serialized) {
				changed = true;
				let currentTtl: number | undefined;
				({ currentTtl, maxTtl } = getTtl(ttl, step, maxTtl));
				currentTree[TreeKeys.value] = serialized;
				if (currentTtl) {
					currentTree[TreeKeys.deadline] = now + currentTtl * MILLISECOND_SCALE;
				} else if (currentTree[TreeKeys.deadline]) {
					currentTree[TreeKeys.deadline] = undefined;
				}
			}
		}
		return { changed, maxTtl };
	}

	/**
	 * Returns an array of trees from a asyncIterable of serialized trees
	 * @param iterable The async iterable of serialized trees
	 * @returns The array of trees
	 */
	getTreeListFromAsyncIterable(iterable: AsyncIterable<R | undefined>) {
		return fluentAsync(iterable)
			.filter()
			.map((buffer) => this.deserializeTree(buffer))
			.filter()
			.toArray();
	}
}
