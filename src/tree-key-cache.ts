import { getChainedKey } from './utils/get-chained-key';
import {
	ChainedObject,
	FullSetItem,
	IterateStep,
	KeyTreeCacheOptions,
	KeyTreeCacheStorage,
	Step,
	Tree,
	TreeKeys,
} from './types';
import { dontWait, getKey, isUndefined } from './utils';
import {
	createTraversalItem,
	treePreOrderBreadthFirstSearch,
	treePreOrderDepthFirstSearch,
} from './utils/graphs';
import { buildKey } from './utils/graphs/build-key';
import {
	TraversalItem,
	treeRefSymbol,
	valueSymbol,
} from './utils/graphs/tree-pre-order-traversal';
import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';

const defaultSerializer = {
	deserialize: JSON.parse.bind(JSON),
	serialize: JSON.stringify.bind(JSON),
};

const defaultOptions: Required<
	Omit<KeyTreeCacheOptions<unknown>, 'keyLevelNodes'>
> = {
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
	private options: Required<KeyTreeCacheOptions<T, R>>;

	constructor(
		private storage: KeyTreeCacheStorage<R>,
		options: KeyTreeCacheOptions<T, R>,
	) {
		super();
		this.options = {
			...(defaultOptions as Required<KeyTreeCacheOptions<T, R>>),
			...options,
		};
	}

	private getStep(
		buffer: R | undefined,
		nodeRef: TraversalItem<unknown>,
		createValue?: (node: ChainedObject) => T | undefined,
	): Step<T> {
		let value: T | undefined;
		if (!buffer) {
			if (!createValue) {
				throw new TypeError('createValue not informed!');
			}
			value = createValue(nodeRef);
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
				const buffer = await this.storage.get(chainedKey);
				if (!buffer) {
					continue;
				}
				const step = this.getStep(buffer, nodeRef);
				yield step as IterateStep<T>;
			} while (nodeRef.level < upTo);
		}

		if (nodeRef && length > nodeRef.level) {
			nodeRef = this.getNextStorageNode(path, nodeRef.level, nodeRef, treeRef);
			const chainedKey = buildKey(nodeRef);
			const buffer = await this.storage.get(chainedKey);
			if (buffer) {
				let tree: Tree<R> | undefined = this.deserializeTree(buffer);
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
		ttl?: number,
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
		createValue: (node: ChainedObject) => T | undefined,
		ttl?: number,
		previousKeys: string[] = [],
		minLevelSemaphore = 0,
	): AsyncIterable<Step<T>> {
		const { keyLevelNodes } = this.options;
		const { length } = path;
		const tree: Tree<R> = {};
		let upTo = Math.min(keyLevelNodes - 1, length);
		let currentLevel = previousKeys.length;
		let prevKeys = previousKeys.join(':');
		let chainedKey: string | undefined;
		let nodeRef: TraversalItem<R> | undefined;
		let key = '';
		const now = Date.now();

		while (currentLevel < upTo) {
			({ prevKeys, chainedKey, key } = getChainedKey(
				path,
				currentLevel,
				prevKeys,
			));
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
				await this.persistStep(step, currentSerialized, chainedKey, ttl);
			} finally {
				dontWait(release);
			}
		}
		if (currentLevel < length) {
			if (!chainedKey) {
				throw new TypeError('Non consistent storage');
			}
			({ prevKeys, chainedKey, key } = getChainedKey(
				path,
				currentLevel,
				prevKeys,
			));
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
					const currentSerialized = currentTree[TreeKeys.value];
					nodeRef = createTraversalItem(key, currentLevel, nodeRef, tree);
					const step = this.getStep(currentSerialized, nodeRef, createValue);
					yield step;
					changed = this.enrichTree(
						step,
						currentSerialized,
						changed,
						currentTree,
						ttl,
						now,
					);
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
				const currentSerialized = currentTree[TreeKeys.value];
				nodeRef = createTraversalItem(key, currentLevel, nodeRef, tree);
				const step = this.getStep(currentSerialized, nodeRef, createValue);
				yield step;
				changed = this.enrichTree(
					step,
					currentSerialized,
					changed,
					currentTree,
					ttl,
					now,
				);
				if (changed) {
					await this.persistTree(chainedKey, ttl, rootTree);
				}
			} finally {
				dontWait(release);
			}
		}
	}

	private enrichTree(
		step: Step<T>,
		currentSerialized: R | undefined,
		changed: boolean,
		currentTree: Tree<R>,
		ttl: number | undefined,
		now: number,
	) {
		if (!isUndefined(step.value)) {
			const serialized = this.serializeValue(step.value);
			if (currentSerialized !== serialized) {
				changed = true;
				currentTree[TreeKeys.value] = serialized;
				if (ttl) {
					currentTree[TreeKeys.deadline] = now + ttl * MILLISECOND_SCALE;
				}
			}
		}
		return changed;
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
		ttl?: number,
	): AsyncIterable<FullSetItem<T>> {
		const iterable = treePreOrderBreadthFirstSearch(tree);
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
				await this.persistStep(step, currentSerialized, chainedKey, ttl);
			} finally {
				dontWait(release);
			}
		}
	}

	private async persistStep(
		step: FullSetItem<T> | Step<T>,
		currentSerialized: R | undefined,
		chainedKey: string,
		ttl: number | undefined,
	) {
		if (!isUndefined(step.value)) {
			const serialized = this.options.valueSerializer.serialize(step.value);
			if (currentSerialized !== serialized) {
				await this.storage.set(chainedKey, serialized, ttl);
			}
		}
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

	private getFullSetItem(currentTree: Tree<R>, breadthNode: TraversalItem<T>) {
		const currentSerialized = currentTree?.[TreeKeys.value];
		const baseLevel = breadthNode.level;
		const node: FullSetItem<T> = {
			oldValue: currentSerialized
				? this.deserializeValue(currentSerialized)
				: undefined,
			value: breadthNode[valueSymbol],
			key: breadthNode.key,
			level: baseLevel,
		};
		return { node, currentSerialized };
	}

	private checkFullSetItemChange(
		item: { node: FullSetItem<T>; currentSerialized: R | undefined },
		changed: boolean,
		currentTree: Tree<R>,
	) {
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
		ttl: number | undefined,
	): AsyncIterable<FullSetItem<T>> {
		const { [treeRefSymbol]: treeRef } = breadthNode;
		const serializedTree = await this.storage.get(chainedKey);
		const rootTree: Tree<R> = serializedTree
			? this.options.treeSerializer.deserialize(serializedTree)
			: {};
		let currentTree: Tree<R> | undefined = rootTree;
		const stack = [];
		let changed = false;
		const rootItem = this.getFullSetItem(currentTree, breadthNode);
		yield rootItem.node;
		changed = this.checkFullSetItemChange(rootItem, changed, currentTree);
		for (const depthNode of treePreOrderDepthFirstSearch(treeRef)) {
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
			const item = this.getFullSetItem(currentTree, depthNode);
			yield item.node;
			changed = this.checkFullSetItemChange(item, changed, currentTree);
		}

		if (changed) {
			await this.persistTree(chainedKey, ttl, rootTree);
		}
	}
}
