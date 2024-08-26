import { getChainedKey } from './internal/get-chained-key';
import {
	ChainedObject,
	FullSetItem,
	IterateStep,
	KeyTreeCacheOptions,
	KeyTreeCacheStorage,
	Step,
	StepTtl,
	Tree,
	TreeKeys,
} from './types';
import {
	createTraversalItem,
	treePostOrderBreadthFirstSearch,
	treePostOrderDepthFirstSearch,
	treePreOrderBreadthFirstSearch,
	treePreOrderDepthFirstSearch,
} from './utils/graphs';
import { buildKey, splitKey } from './utils/build-key';
import {
	TraversalItem,
	treeRefSymbol,
	valueSymbol,
} from './utils/graphs/graph-types';
import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';
import {
	asyncTreePostOrderBreadthFirstSearch,
	asyncTreePostOrderDepthFirstSearch,
	asyncTreePreOrderBreadthFirstSearch,
	asyncTreePreOrderDepthFirstSearch,
} from './utils/graphs/async';
import {
	MergedOptions,
	getNextTreeNode,
	TreeInternalControl,
	getTreeCurrentSerializedValue,
	pruneTree,
	getNextStorageNode,
	getTtl,
	isUndefinedOrNull,
	getKey,
	defaultOptions,
} from './internal';
import { constant, fluentAsync, fluentObject } from '@codibre/fluent-iterable';
import { dontWait } from './utils';
type Events = {
	deserializeError(error: unknown, type: 'value' | 'tree'): void;
};

/**
 * A Cache class using a non balanced, non binary tree, with
 * no children order guaranteed, and support for O(1) path navigation
 * This class also supports saving part of the nodes value by value,
 * down to the level specified by options.keyLevelNodes, and, from that
 * point, the whole sub-tree is saved in the cache key.
 * This makes possible to have extremely low storage caches, as this strategy
 * helps avoiding saving duplicated key parts, and also saving
 * lots of tree into a single one.
 * You can also navigate through the tree using a given path, or even BFS or DFS,
 * pre-order of post-order, whenever you need!
 * Finally, this class offers the ability to determine ttl for each node and to
 * prune the tree, specially useful for whole saved sub-trees, as your persistence
 * mechanism hardly will have the ability to manage it by itself.
 */
export class TreeKeyCache<
	T,
	R = string,
> extends (EventEmitter as new () => TypedEmitter<Events>) {
	private options: MergedOptions<T, R>;
	private internal: TreeInternalControl<T, R>;

	constructor(
		private storage: KeyTreeCacheStorage<R>,
		options: KeyTreeCacheOptions<T, R>,
	) {
		super();
		this.options = {
			...(defaultOptions as MergedOptions<T, R>),
			...(fluentObject(options)
				.filter(([, v]) => !isUndefinedOrNull(v))
				.toObject(0, 1) as KeyTreeCacheOptions<T, R>),
		};
		this.internal = new TreeInternalControl(this.options, this, this.storage);
	}

	/**
	 * Create a iterator that yields each value of the provided path
	 * @param path The path to be traversed
	 */
	async *iteratePath(path: string[]): AsyncIterable<IterateStep<T>> {
		const { keyLevelNodes } = this.options;
		const { length } = path;
		const upTo = Math.min(keyLevelNodes - 1, length);
		let nodeRef: TraversalItem<R> | undefined;
		const treeRef: Tree<R> = {};
		const now = Date.now();

		if (upTo > 0) {
			do {
				nodeRef = getNextStorageNode(
					path,
					nodeRef?.level ?? 0,
					nodeRef,
					treeRef,
					now,
				);
				const chainedKey = buildKey(nodeRef);
				const step = await this.internal.getMemoizedStep(chainedKey, nodeRef);
				if (isUndefinedOrNull(step)) continue;
				yield step as IterateStep<T>;
			} while (nodeRef.level < upTo);
		}

		if (nodeRef && length > nodeRef.level) {
			nodeRef = getNextStorageNode(path, nodeRef.level, nodeRef, treeRef, now);
			const chainedKey = buildKey(nodeRef);
			let tree = await this.internal.getMemoizedTree(chainedKey, nodeRef, now);
			if (tree) {
				while (nodeRef && nodeRef.level < length && tree) {
					const v = getTreeCurrentSerializedValue(tree, now);
					if (!isUndefinedOrNull(v)) {
						yield (await this.internal.getStep(v, nodeRef)) as IterateStep<T>;
					}
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
					const value = getTreeCurrentSerializedValue(tree, now);
					if (!isUndefinedOrNull(value) && nodeRef) {
						nodeRef = createTraversalItem(
							nodeRef.key,
							nodeRef.level,
							nodeRef.parentRef,
							treeRef,
							now,
						);
						yield (await this.internal.getStep(
							tree[TreeKeys.value],
							nodeRef,
						)) as IterateStep<T>;
					}
				}
			}
		}
	}

	/**
	 * Return only the last value for the provided path
	 * @param path The path to be traversed
	 */
	async getNode(path: string[]): Promise<Step<T> | undefined> {
		const nodeRef = await this.internal.getNodeRef(path, false);

		if (!nodeRef) return;

		if (nodeRef?.[valueSymbol]) {
			return this.internal.getStep(nodeRef[valueSymbol], nodeRef);
		}
	}

	/**
	 * Sets the value of the node for the provided path
	 * @param path The path to be traversed
	 */
	async setNode(
		path: string[],
		value: T | (() => Promise<T>),
		ttl?: StepTtl<T>,
	): Promise<void> {
		if (isUndefinedOrNull(value)) {
			return;
		}
		const { length } = path;
		for await (const item of this.deepTreeSet(
			path,
			() => undefined,
			ttl,
			[],
			length,
		)) {
			if (item.level === length) {
				item.value =
					typeof value === 'function'
						? await (value as () => Promise<T>)()
						: value;
			}
		}
	}

	/**
	 * Set the value for the specified path, calling createValue for each node on the way
	 * @param path the path to set
	 * @param createValue callback to create non existing values
	 * @param previousKeys previously traversed keys, if there is any
	 */
	async *deepTreeSet(
		path: string[],
		createValue?: (node: ChainedObject) => T | undefined,
		ttl?: StepTtl<T>,
		previousKeys: string[] = [],
		minLevelSemaphore = 0,
	): AsyncIterable<Step<T>> {
		const { keyLevelNodes } = this.options;
		const { length } = path;
		const tree: Tree<R> = {};
		let upTo = Math.min(keyLevelNodes - 1, length);
		let currentLevel = previousKeys.length;
		let chainedKey =
			previousKeys.length > 0 ? previousKeys.join(':') : undefined;
		let nodeRef: TraversalItem<R> | undefined;
		let key = '';
		let maxTtl: number | undefined;
		const now = Date.now();

		while (currentLevel < upTo) {
			const previousChainedKey = chainedKey;
			({ chainedKey, key } = getChainedKey(path, currentLevel, chainedKey));
			await this.storage.registerChild?.(previousChainedKey, key);
			const release =
				minLevelSemaphore <= currentLevel
					? await this.options.semaphore.acquire(chainedKey)
					: undefined;
			try {
				const currentSerialized = await this.storage.get(chainedKey);
				currentLevel++;
				nodeRef = createTraversalItem(key, currentLevel, nodeRef, tree, now);
				const step = await this.internal.getStep(
					currentSerialized,
					nodeRef,
					createValue,
				);
				yield step;
				await this.internal.persistStep(
					step,
					currentSerialized,
					chainedKey,
					ttl,
				);
			} finally {
				dontWait(release);
			}
		}
		if (currentLevel < length) {
			if (!chainedKey) {
				throw new TypeError('Non consistent storage');
			}
			({ chainedKey, key } = getChainedKey(path, currentLevel, chainedKey));
			currentLevel++;
			const release =
				minLevelSemaphore <= currentLevel
					? await this.options.semaphore.acquire(chainedKey)
					: undefined;
			try {
				const buffer = await this.storage.get(chainedKey);
				const rootTree: Tree<R> = buffer
					? this.options.treeSerializer.deserialize(buffer)
					: {};
				let currentTree = rootTree;
				let changed = false;
				upTo = length - 1;
				while (currentLevel <= upTo) {
					const currentSerialized = getTreeCurrentSerializedValue(
						currentTree,
						now,
					);
					nodeRef = createTraversalItem(key, currentLevel, nodeRef, tree, now);
					const step = await this.internal.getStep(
						currentSerialized,
						nodeRef,
						createValue,
					);
					yield step;
					let currentTtl: number | undefined;
					const enrichResult = this.internal.enrichTree(
						step,
						currentSerialized,
						currentTree,
						currentTtl,
						now,
						maxTtl,
					);
					changed = changed || enrichResult.changed;
					maxTtl = enrichResult.maxTtl;
					key = getKey(path, currentLevel);
					currentTree[TreeKeys.children] ??= {};
					let nextTree = currentTree[TreeKeys.children][key];
					if (!nextTree) {
						nextTree = currentTree[TreeKeys.children][key] = {};
						changed = true;
					}
					currentTree = nextTree;
					currentLevel++;
				}
				const currentSerialized = getTreeCurrentSerializedValue(
					currentTree,
					now,
				);
				nodeRef = createTraversalItem(key, currentLevel, nodeRef, tree, now);
				const step = await this.internal.getStep(
					currentSerialized,
					nodeRef,
					createValue,
				);
				yield step;
				let currentTtl: number | undefined;
				({ currentTtl, maxTtl } = getTtl(ttl, step, maxTtl));
				const enrichResult = this.internal.enrichTree(
					step,
					currentSerialized,
					currentTree,
					currentTtl,
					now,
					maxTtl,
				);
				changed = changed || enrichResult.changed;
				maxTtl = enrichResult.maxTtl;
				if (changed) {
					await this.internal.persistTree(chainedKey, maxTtl, rootTree);
				}
			} finally {
				dontWait(release);
			}
		}
	}

	/**
	 * Set all the given values of the informed tree
	 * @param tree The tree with the values to be set. It need to start from root node. Any node you don't want to change, just leave it undefined
	 * @param createValue Callback for leaf creation when it does not exist
	 */
	async *fullTreeSet(
		tree: Tree<T>,
		createValue: (node: ChainedObject) => T,
		minLevelSemaphore = 0,
		ttl?: StepTtl<T>,
	): AsyncIterable<FullSetItem<R, T>> {
		const iterable = treePreOrderBreadthFirstSearch(tree, undefined);
		const { keyLevelNodes } = this.options;
		let currentSerialized: R | undefined;
		for (const breadthNode of iterable) {
			const { level } = breadthNode;
			if (level > keyLevelNodes) {
				break;
			}
			const chainedKey = buildKey(breadthNode);
			const release =
				minLevelSemaphore <= level
					? await this.options.semaphore.acquire(chainedKey)
					: undefined;
			try {
				if (level === keyLevelNodes) {
					yield* this.internal.saveFullTreeValue(
						breadthNode,
						chainedKey,
						createValue,
						ttl,
					);
					continue;
				}
				await this.internal.registerKeyLevelChildren(breadthNode, chainedKey);
				const value = breadthNode[valueSymbol];
				currentSerialized = await this.storage.get(chainedKey);
				const old = await this.internal.getStep(
					currentSerialized,
					breadthNode,
					createValue,
				);
				const oldValue = old.value;
				const newValue = value ?? oldValue;
				const step: FullSetItem<R, T> = {
					...old,
					oldValue,
					value: newValue,
					currentSerialized: undefined,
				};
				yield step;
				await this.internal.persistStep(
					step,
					currentSerialized,
					chainedKey,
					ttl,
				);
			} finally {
				dontWait(release);
			}
		}
	}

	/**
	 * Returns an async iterable that traverses the tree on a pre order, breadth first search fashion.
	 * To perform traversals on key level nodes, you need to have implemented the getChildren method
	 * on the storage. Traversals on tree level nodes are always supported
	 * @param basePath The base path to be traversed
	 */
	preOrderBreadthFirstSearch(basePath?: string[]) {
		return this.internal.getTraversalStepsIterable(
			asyncTreePreOrderBreadthFirstSearch,
			treePreOrderBreadthFirstSearch,
			basePath,
		);
	}

	/**
	 * Returns an async iterable that traverses the tree on a pre order, depth first search fashion.
	 * To perform traversals on key level nodes, you need to have implemented the getChildren method
	 * on the storage. Traversals on tree level nodes are always supported
	 * @param basePath The base path to be traversed
	 */
	preOrderDepthFirstSearch(basePath?: string[]): AsyncIterable<Step<T>> {
		return this.internal.getTraversalStepsIterable(
			asyncTreePreOrderDepthFirstSearch,
			treePreOrderDepthFirstSearch,
			basePath,
		);
	}

	/**
	 * Returns an async iterable that traverses the tree on a post order, breadth first search fashion.
	 * To perform traversals on key level nodes, you need to have implemented the getChildren method
	 * on the storage. Traversals on tree level nodes are always supported
	 * @param basePath The base path to be traversed
	 */
	postOrderBreadthFirstSearch(basePath?: string[]): AsyncIterable<Step<T>> {
		return this.internal.getTraversalStepsIterable(
			asyncTreePostOrderBreadthFirstSearch,
			treePostOrderBreadthFirstSearch,
			basePath,
		);
	}

	/**
	 * Returns an async iterable that traverses the tree on a post order, depth first search fashion.
	 * To perform traversals on key level nodes, you need to have implemented the getChildren method
	 * on the storage. Traversals on tree level nodes are always supported
	 * @param basePath The base path to be traversed
	 */
	postOrderDepthFirstSearch(basePath?: string[]): AsyncIterable<Step<T>> {
		return this.internal.getTraversalStepsIterable(
			asyncTreePostOrderDepthFirstSearch,
			treePostOrderDepthFirstSearch,
			basePath,
		);
	}

	/**
	 * Reprocess all the key level nodes, registering every key children of them.
	 * To use this method, randomIterate and registerChild must be implemented on the storage.
	 * Optionally, clearAllChildrenRegistry can also be implemented, which will make
	 * all the previously registered children be excluded before performing the operation
	 * @param partition how many children will be registered per time
	 */
	async *reprocessAllKeyLevelChildren(partition = 1) {
		if (!this.storage.randomIterate || !this.storage.registerChild) {
			throw new TypeError(
				'Storage implementation does not support key level children reprocessing',
			);
		}
		await this.storage.clearAllChildrenRegistry?.();
		const promises: Array<Promise<unknown>> = [];
		for await (const key of this.storage.randomIterate()) {
			const path = splitKey(key);
			let chainedKey: string | undefined;
			const processed: string[] = [];
			for (const partialKey of path) {
				promises.push(
					this.storage
						.registerChild(chainedKey, partialKey)
						.then(constant([chainedKey, partialKey])),
				);
				processed.push(partialKey);
				chainedKey = buildKey(processed);
				if (promises.length >= partition) {
					yield Promise.all(promises);
					promises.length = 0;
				}
			}
		}
		if (promises.length > 0) {
			yield Promise.all(promises);
		}
	}

	/**
	 * Iterates randomly over the storage
	 * @param pattern A pattern to filter the desired keys. Notice that the value this pattern will support is deeply connected to the storage implementation used
	 */
	randomIterate(pattern?: string) {
		return this.internal
			.internalRandomIterate(pattern, true, false)
			.map((item) => this.internal.getStep(item[valueSymbol], item));
	}

	/**
	 * Performs a prune, removing all empty or expired nodes from tree level nodes.
	 * @param pattern The pattern of storage keys to be pruned. If not informed, all tree level keys will be pruned.
	 */
	async prune(pattern?: string) {
		await fluentAsync(this.internal.internalRandomIterate(pattern, false, true))
			.filter()
			.filter(
				(item) =>
					item.level === this.options.keyLevelNodes &&
					pruneTree(item[treeRefSymbol], item.parentRef),
			)
			.waitAll(async (item) => {
				const chainedKey = buildKey(item);
				const release = await this.options.semaphore.acquire(chainedKey);
				const ttl = await this.storage.getCurrentTtl(chainedKey);
				await this.internal.persistTree(chainedKey, ttl, item[treeRefSymbol]);
				dontWait(release);
			});
	}
}
