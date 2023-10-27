import { getChainedKey } from './utils/get-chained-key';
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
import { constant, dontWait, getKey, isUndefined } from './utils';
import {
	createTraversalItem,
	treePreOrderBreadthFirstSearch,
	treePreOrderDepthFirstSearch,
} from './utils/graphs';
import { buildKey, splitKey } from './utils/graphs/build-key';
import {
	StorageTraversalItem,
	TraversalItem,
	treeRefSymbol,
	valueSymbol,
} from './utils/graphs/graph-types';
import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';
import {
	asyncTreePreOrderBreadthFirstSearch,
	asyncTreePreOrderDepthFirstSearch,
} from './utils/graphs/async';
import { DefaultOptions, MergedOptions } from './options-types';
import { AsyncTreeRef } from './async-tree-ref';

const defaultSerializer = {
	deserialize: JSON.parse.bind(JSON),
	serialize: JSON.stringify.bind(JSON),
};

const defaultOptions: DefaultOptions<unknown, unknown> = {
	valueSerializer: defaultSerializer,
	treeSerializer: defaultSerializer,
	semaphore: {
		acquire: async () => async () => undefined,
	},
};

const MILLISECOND_SCALE = 1000;

type Events = {
	deserializeError(error: unknown, type: 'value' | 'tree'): void;
};

export class TreeKeyCache<
	T,
	R = string,
> extends (EventEmitter as new () => TypedEmitter<Events>) {
	private options: MergedOptions<T, R>;

	constructor(
		private storage: KeyTreeCacheStorage<R>,
		options: KeyTreeCacheOptions<T, R>,
	) {
		super();
		this.options = {
			...(defaultOptions as MergedOptions<T, R>),
			...options,
		};
	}

	private getStep(
		buffer: R | undefined,
		nodeRef: StorageTraversalItem<unknown>,
		createValue?: (node: ChainedObject) => T | undefined,
	): Step<T> {
		let value: T | undefined;
		if (!buffer) {
			value = createValue?.(nodeRef);
		} else {
			value = this.deserializeValue(buffer);
		}
		return { key: nodeRef.key, value, level: nodeRef.level, nodeRef };
	}

	private deserializeValue(serialized: R): T | undefined {
		try {
			return this.options.valueSerializer.deserialize(serialized);
		} catch (error) {
			this.emit('deserializeError', error, 'value');
		}
	}

	private serializeValue(value: T) {
		return this.options.valueSerializer.serialize(value);
	}

	private deserializeTree(
		buffer: NonNullable<Awaited<R>>,
	): Tree<R> | undefined {
		try {
			return this.options.treeSerializer.deserialize(buffer);
		} catch (error) {
			this.emit('deserializeError', error, 'tree');
		}
	}

	private serializeTree(tree: Tree<R>): R {
		return this.options.treeSerializer.serialize(tree);
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
				nodeRef = this.getNextStorageNode(
					path,
					nodeRef?.level ?? 0,
					nodeRef,
					treeRef,
				);
				const chainedKey = buildKey(nodeRef);
				let step: Step<T> | undefined = this.options.memoizer?.get(chainedKey);
				if (!step) {
					const buffer = await this.storage.get(chainedKey);
					if (!buffer) {
						continue;
					}
					step = this.getStep(buffer, nodeRef);
					this.options.memoizer?.set(chainedKey, step);
				}
				yield step as IterateStep<T>;
			} while (nodeRef.level < upTo);
		}

		if (nodeRef && length > nodeRef.level) {
			nodeRef = this.getNextStorageNode(path, nodeRef.level, nodeRef, treeRef);
			const chainedKey = buildKey(nodeRef);
			let tree: Tree<R> | undefined = this.options.memoizer?.get(chainedKey);
			if (!tree) {
				const buffer = await this.storage.get(chainedKey);
				if (buffer) {
					tree = this.deserializeTree(buffer);
					if (tree) {
						this.options.memoizer?.set(chainedKey, tree);
					}
				}
			}
			if (tree) {
				while (nodeRef && nodeRef.level < length && tree) {
					const { [TreeKeys.value]: v, [TreeKeys.deadline]: deadline } = tree;
					if (!isUndefined(v) && this.isNotExpired(deadline, now)) {
						yield this.getStep(v, nodeRef) as IterateStep<T>;
					}
					({ nodeRef, tree } = this.getNextTreeNode(
						path,
						nodeRef.level,
						tree,
						nodeRef,
						treeRef,
					));
				}
				if (tree) {
					const { [TreeKeys.value]: value, [TreeKeys.deadline]: deadline } =
						tree;
					if (
						!isUndefined(value) &&
						this.isNotExpired(deadline, now) &&
						nodeRef
					) {
						nodeRef = createTraversalItem(
							nodeRef.key,
							nodeRef.level,
							nodeRef.parentRef,
							treeRef,
						);
						yield this.getStep(tree[TreeKeys.value], nodeRef) as IterateStep<T>;
					}
				}
			}
		}
	}

	private isNotExpired(deadline: number | undefined, now: number) {
		return !deadline || deadline > now;
	}

	/**
	 * Return only the last value for the provided path
	 * @param path The path to be traversed
	 */
	async getNode(path: string[]): Promise<Step<T> | undefined> {
		const nodeRef = await this.getNodeRef(path);

		if (!nodeRef) return;

		if (nodeRef?.[valueSymbol]) {
			return this.getStep(nodeRef[valueSymbol], nodeRef);
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
		if (isUndefined(value)) {
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

	private async getNodeRef(
		path: string[],
	): Promise<TraversalItem<R> | undefined> {
		const { length } = path;
		const { keyLevelNodes } = this.options;
		const upTo = Math.min(keyLevelNodes, length);
		let nodeRef: TraversalItem<R> | undefined;
		let chainedKey: string | undefined;
		const treeRef: Tree<R> = {};
		const now = Date.now();

		if (upTo > 0 && (!nodeRef || upTo > nodeRef.level)) {
			do {
				nodeRef = this.getNextStorageNode(
					path,
					nodeRef?.level ?? 0,
					nodeRef,
					treeRef,
				);
			} while (nodeRef.level < upTo);
		}

		if (nodeRef && length >= nodeRef.level) {
			chainedKey = buildKey(nodeRef);
			const buffer = await this.storage.get(chainedKey);
			if (nodeRef.level < keyLevelNodes) {
				nodeRef[valueSymbol] = buffer;
			} else if (buffer) {
				let tree: Tree<R> | undefined =
					this.options.treeSerializer.deserialize(buffer);
				while (nodeRef && nodeRef.level < length && tree) {
					({ nodeRef, tree } = this.getNextTreeNode(
						path,
						nodeRef.level,
						tree,
						nodeRef,
						treeRef,
					));
				}
				if (tree) {
					const { [TreeKeys.value]: value, [TreeKeys.deadline]: deadline } =
						tree;
					if (
						!isUndefined(value) &&
						this.isNotExpired(deadline, now) &&
						nodeRef
					) {
						nodeRef = createTraversalItem(
							nodeRef.key,
							nodeRef.level,
							nodeRef.parentRef,
							tree,
							tree[TreeKeys.value],
						);
					}
				}
			}
		}

		return nodeRef;
	}

	private getNextTreeNode(
		path: string[],
		level: number,
		tree: Tree<R>,
		nodeRef: ChainedObject | undefined,
		treeRef: Tree<R>,
	) {
		const key = getKey(path, level);
		level++;
		const nextTree = tree[TreeKeys.children]?.[key];
		if (!nextTree) {
			return { nodeRef: undefined, tree: undefined };
		}
		return {
			nodeRef: createTraversalItem(key, level, nodeRef, treeRef),
			tree: nextTree,
		};
	}

	private getNextStorageNode(
		path: string[],
		level: number,
		nodeRef: TraversalItem<R> | undefined,
		treeRef: Tree<R>,
	) {
		const key = path[level];
		if (isUndefined(key)) {
			throw new TypeError('Invalid path');
		}
		level++;
		nodeRef = createTraversalItem(key, level, nodeRef, treeRef);
		return nodeRef;
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
				nodeRef = createTraversalItem(key, currentLevel, nodeRef, tree);
				const step = this.getStep(currentSerialized, nodeRef, createValue);
				yield step;
				maxTtl = await this.persistStep(
					step,
					currentSerialized,
					chainedKey,
					ttl,
					maxTtl,
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
					const currentSerialized = this.getTreeCurrentSerializedValue(
						currentTree,
						now,
					);
					nodeRef = createTraversalItem(key, currentLevel, nodeRef, tree);
					const step = this.getStep(currentSerialized, nodeRef, createValue);
					yield step;
					let currentTtl: number | undefined;
					const enrichResult = this.enrichTree(
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
				const currentSerialized = this.getTreeCurrentSerializedValue(
					currentTree,
					now,
				);
				nodeRef = createTraversalItem(key, currentLevel, nodeRef, tree);
				const step = this.getStep(currentSerialized, nodeRef, createValue);
				yield step;
				let currentTtl: number | undefined;
				({ currentTtl, maxTtl } = this.getTtl(ttl, step, maxTtl));
				const enrichResult = this.enrichTree(
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
					await this.persistTree(chainedKey, maxTtl, rootTree);
				}
			} finally {
				dontWait(release);
			}
		}
	}

	private getTreeCurrentSerializedValue(currentTree: Tree<R>, now: number) {
		const { [TreeKeys.deadline]: deadline } = currentTree;
		const currentSerialized = this.isNotExpired(deadline, now)
			? currentTree[TreeKeys.value]
			: undefined;
		return currentSerialized;
	}

	private getTtl(
		ttl: StepTtl<T> | undefined,
		step: Step<T>,
		maxTtl: number | undefined,
	) {
		const currentTtl = typeof ttl === 'function' ? ttl(step) : ttl;
		if (currentTtl && (!maxTtl || currentTtl > maxTtl)) {
			maxTtl = currentTtl;
		}
		return { currentTtl, maxTtl };
	}

	private enrichTree(
		step: Step<T>,
		currentSerialized: R | undefined,
		currentTree: Tree<R>,
		ttl: StepTtl<T> | undefined,
		now: number,
		maxTtl: number | undefined,
	) {
		let changed = false;
		if (!isUndefined(step.value)) {
			const serialized = this.serializeValue(step.value);
			if (currentSerialized !== serialized) {
				changed = true;
				let currentTtl: number | undefined;
				({ currentTtl, maxTtl } = this.getTtl(ttl, step, maxTtl));
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
	 * Set all the given values of the informed tree
	 * @param tree The tree with the values to be set. It need to start from root node. Any node you don't want to change, just leave it undefined
	 * @param createValue Callback for leaf creation when it does not exist
	 */
	async *fullTreeSet(
		tree: Tree<T>,
		createValue: (node: ChainedObject) => T,
		minLevelSemaphore = 0,
		ttl?: StepTtl<T>,
	): AsyncIterable<FullSetItem<T>> {
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
					yield* this.saveFullTreeValue(
						breadthNode,
						chainedKey,
						createValue,
						ttl,
					);
					continue;
				}
				await this.registerKeyLevelChildren(breadthNode, chainedKey);
				const value = breadthNode[valueSymbol];
				currentSerialized = await this.storage.get(chainedKey);
				const old = this.getStep(currentSerialized, breadthNode, createValue);
				const oldValue = old.value;
				const newValue = value ?? oldValue;
				const step: FullSetItem<T> = {
					...old,
					oldValue,
					value: newValue,
				};
				yield step;
				await this.persistStep(
					step,
					currentSerialized,
					chainedKey,
					ttl,
					undefined,
				);
			} finally {
				dontWait(release);
			}
		}
	}

	private async registerKeyLevelChildren(
		breadthNode: TraversalItem<T>,
		chainedKey: string,
	) {
		if (this.storage.registerChild) {
			const children = breadthNode[treeRefSymbol][TreeKeys.children];
			if (children) {
				for (const key in children) {
					if (key in children) {
						await this.storage.registerChild(chainedKey, key);
					}
				}
			}
		}
	}

	private async persistStep(
		step: FullSetItem<T> | Step<T>,
		currentSerialized: R | undefined,
		chainedKey: string,
		ttl: StepTtl<T> | undefined,
		maxTtl: number | undefined,
	) {
		if (!isUndefined(step.value)) {
			const serialized = this.options.valueSerializer.serialize(step.value);
			if (currentSerialized !== serialized) {
				let currentTtl: number | undefined;
				({ currentTtl, maxTtl } = this.getTtl(ttl, step, maxTtl));
				await this.storage.set(chainedKey, serialized, currentTtl);
			}
		}

		return maxTtl;
	}

	private async persistTree(
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

	private getFullSetItem(
		currentTree: Tree<R>,
		breadthNode: TraversalItem<T>,
		now: number,
	) {
		const currentSerialized = this.getTreeCurrentSerializedValue(
			currentTree,
			now,
		);
		const { level, key, parentRef } = breadthNode;
		const node: FullSetItem<T> = {
			oldValue: currentSerialized
				? this.deserializeValue(currentSerialized)
				: undefined,
			value: breadthNode[valueSymbol],
			key,
			level,
			nodeRef: {
				key,
				level,
				parentRef,
			},
		};
		return { node, currentSerialized };
	}

	private checkFullSetItemChange(
		item: { node: FullSetItem<T>; currentSerialized: R | undefined },
		currentTree: Tree<R>,
	) {
		let changed = false;
		const { node, currentSerialized } = item;
		if (node.value !== undefined) {
			const serialized = this.options.valueSerializer.serialize(node.value);
			if (serialized !== currentSerialized) {
				currentTree[TreeKeys.value] = serialized;
				changed = true;
			}
		}
		return changed;
	}

	private async *saveFullTreeValue(
		breadthNode: TraversalItem<T>,
		chainedKey: string,
		createValue: (node: ChainedObject) => T | undefined,
		ttl: StepTtl<T> | undefined,
	): AsyncIterable<FullSetItem<T>> {
		const now = Date.now();
		const { [treeRefSymbol]: treeRef } = breadthNode;
		const serializedTree = await this.storage.get(chainedKey);
		const rootTree: Tree<R> = serializedTree
			? this.options.treeSerializer.deserialize(serializedTree)
			: {};
		let currentTree: Tree<R> | undefined = rootTree;
		const stack = [];
		let changed = false;
		const rootItem = this.getFullSetItem(currentTree, breadthNode, now);
		yield rootItem.node;
		changed = this.checkFullSetItemChange(rootItem, currentTree) || changed;
		let maxTtl: number | undefined;
		for (const depthNode of treePreOrderDepthFirstSearch(
			treeRef,
			breadthNode,
		)) {
			const { level, key } = depthNode;
			if (stack.length < level) {
				if (!currentTree) {
					throw new Error('Algorithm error');
				}
				currentTree[TreeKeys.children] ??= {};
				let next: Tree<R> | undefined = currentTree[TreeKeys.children][key];
				if (isUndefined(next)) {
					next = currentTree[TreeKeys.children][key] = {};
					const value = createValue(depthNode);
					if (!isUndefined(value)) {
						changed = true;
						next[TreeKeys.value] =
							this.options.valueSerializer.serialize(value);
					}
				}
				currentTree = next;
				stack.push(currentTree);
			} else {
				while (stack.length > level && stack.length > 0) {
					currentTree = stack.pop() as Tree<R>;
				}
			}
			const item = this.getFullSetItem(currentTree, depthNode, now);
			yield item.node;
			const itemChanged = this.checkFullSetItemChange(item, currentTree);
			if (itemChanged) {
				({ maxTtl } = this.getTtl(ttl, item.node, maxTtl));
			}
			changed = itemChanged || changed;
		}

		if (changed) {
			await this.persistTree(chainedKey, maxTtl, rootTree);
		}
	}

	async *preOrderBreadthFirstSearch(basePath?: string[]) {
		const nodeRef = basePath ? await this.getNodeRef(basePath) : undefined;
		if (!basePath || nodeRef) {
			if (nodeRef) {
				yield this.getStep(nodeRef[valueSymbol], nodeRef);
			}
			const iterable =
				nodeRef && this.options.keyLevelNodes <= (basePath as string[]).length
					? treePreOrderBreadthFirstSearch(nodeRef[treeRefSymbol], nodeRef)
					: asyncTreePreOrderBreadthFirstSearch(
							new AsyncTreeRef(nodeRef, this.storage, this.options),
							nodeRef,
					  );
			for await (const item of iterable) {
				yield this.getStep(item[valueSymbol], item);
			}
		}
	}

	async *preOrderDepthFirstSearch(basePath?: string[]): AsyncIterable<Step<T>> {
		const nodeRef = basePath ? await this.getNodeRef(basePath) : undefined;
		if (!basePath || nodeRef) {
			if (nodeRef) {
				yield this.getStep(nodeRef[valueSymbol], nodeRef);
			}
			const iterable =
				nodeRef && this.options.keyLevelNodes <= (basePath as string[]).length
					? treePreOrderDepthFirstSearch(nodeRef[treeRefSymbol], nodeRef)
					: asyncTreePreOrderDepthFirstSearch(
							new AsyncTreeRef(nodeRef, this.storage, this.options),
							nodeRef,
					  );
			for await (const item of iterable) {
				yield this.getStep(item[valueSymbol], item);
			}
		}
	}

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
	async *randomIterate(pattern?: string) {
		if (!this.storage.randomIterate) {
			throw new TypeError(
				'Storage implementation does not support random iteration',
			);
		}
		for await (const key of this.storage.randomIterate(pattern)) {
			const path = splitKey(key);
			const nodeRef = await this.getNodeRef(path);
			if (nodeRef) {
				const iterable =
					nodeRef.level >= this.options.keyLevelNodes
						? treePreOrderBreadthFirstSearch(nodeRef[treeRefSymbol], nodeRef)
						: [nodeRef];
				for (const item of iterable) {
					yield this.getStep(item[valueSymbol], item);
				}
			}
		}
	}
}
