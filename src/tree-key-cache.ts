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

const defaultOptions: Required<
	Omit<KeyTreeCacheOptions<unknown>, 'keyLevelNodes'>
> = {
	deserialize: JSON.parse.bind(JSON),
	serialize: JSON.stringify.bind(JSON),
	semaphore: {
		acquire: async () => async () => undefined,
	},
};

export class TreeKeyCache<T> {
	private options: Required<KeyTreeCacheOptions<T>>;
	constructor(
		private storage: KeyTreeCacheStorage,
		options: KeyTreeCacheOptions<T>,
	) {
		this.options = {
			...(defaultOptions as Required<KeyTreeCacheOptions<T>>),
			...options,
		};
	}

	private getStep(
		buffer: string | undefined,
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
			value = this.options.deserialize(buffer.toString());
		}
		return { key: nodeRef.key, value, level: nodeRef.level, nodeRef };
	}

	/**
	 * Create a iterator that yields each value of the provided path
	 * @param path The path to be traversed
	 */
	async *iteratePath(path: string[]): AsyncIterable<IterateStep<T>> {
		const { keyLevelNodes } = this.options;
		const { length } = path;
		const upTo = Math.min(keyLevelNodes - 1, length);
		let nodeRef: TraversalItem<string> | undefined;
		const treeRef: Tree<string> = {};

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
				let tree: Tree<string> | undefined = JSON.parse(buffer);
				while (nodeRef && nodeRef.level < length && tree) {
					const { [TreeKeys.value]: v } = tree;
					if (!isUndefined(v)) {
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
				if (tree && !isUndefined(tree[TreeKeys.value]) && nodeRef) {
					nodeRef = createTraversalItem(
						nodeRef.key,
						nodeRef.level,
						nodeRef,
						treeRef,
					);
					yield this.getStep(tree[TreeKeys.value], nodeRef) as IterateStep<T>;
				}
			}
		}
	}

	/**
	 * Return only the last value for the provided path
	 * @param path The path to be traversed
	 */
	async getNode(path: string[]): Promise<Step<T> | undefined> {
		const nodeRef = await this.getNodeRef(path);

		if (nodeRef?.[valueSymbol]) {
			return this.getStep(nodeRef[valueSymbol], nodeRef);
		}
	}

	/**
	 * Sets the value of the node for the provided path
	 * @param path The path to be traversed
	 */
	async setNode(path: string[], value: T): Promise<void> {
		if (isUndefined(value)) {
			return;
		}
		const { length } = path;
		for await (const item of this.deepTreeSet(path, () => undefined)) {
			if (item.level === length) {
				item.value = value;
			}
		}
	}

	private async getNodeRef(
		path: string[],
	): Promise<TraversalItem<string> | undefined> {
		const { length } = path;
		const { keyLevelNodes } = this.options;
		const upTo = Math.min(keyLevelNodes, length);
		let nodeRef: TraversalItem<string> | undefined;
		let chainedKey: string | undefined;
		const treeRef: Tree<string> = {};

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
				let tree: Tree<string> | undefined = JSON.parse(buffer);
				while (nodeRef && nodeRef.level < length && tree) {
					({ nodeRef, tree } = this.getNextTreeNode(
						path,
						nodeRef.level,
						tree,
						nodeRef,
						treeRef,
					));
				}
				if (tree && !isUndefined(tree[TreeKeys.value]) && nodeRef) {
					nodeRef = createTraversalItem(
						nodeRef.key,
						nodeRef.level,
						nodeRef,
						tree,
						tree[TreeKeys.value],
					);
				}
			}
		}

		return nodeRef;
	}

	private getNextTreeNode(
		path: string[],
		level: number,
		tree: Tree<string>,
		nodeRef: ChainedObject | undefined,
		treeRef: Tree<string>,
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
		nodeRef: TraversalItem<string> | undefined,
		treeRef: Tree<string>,
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
		previousKeys: string[] = [],
	): AsyncIterable<Step<T>> {
		const { keyLevelNodes } = this.options;
		const { length } = path;
		const tree: Tree<string> = {};
		let upTo = Math.min(keyLevelNodes - 1, length);
		let currentLevel = previousKeys.length;
		let prevKeys = previousKeys.join(':');
		let chainedKey: string | undefined;
		let nodeRef: TraversalItem<string> | undefined;
		let key = '';
		while (currentLevel < upTo) {
			({ prevKeys, chainedKey, key } = getChainedKey(
				path,
				currentLevel,
				prevKeys,
			));
			const release = await this.options.semaphore.acquire(chainedKey);
			try {
				const currentSerialized = (
					await this.storage.get(chainedKey)
				)?.toString();
				currentLevel++;
				nodeRef = createTraversalItem(key, currentLevel, nodeRef, tree);
				const step = this.getStep(currentSerialized, nodeRef, createValue);
				yield step;
				await this.persistStep(step, currentSerialized, chainedKey);
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
			const release = await this.options.semaphore.acquire(chainedKey);
			try {
				const buffer = await this.storage.get(chainedKey);
				const rootTree: Tree<string> = buffer ? JSON.parse(buffer) : {};
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
				);
				if (changed) {
					await this.storage.set(chainedKey, JSON.stringify(rootTree));
				}
			} finally {
				dontWait(release);
			}
		}
	}

	private enrichTree(
		step: Step<T>,
		currentSerialized: string | undefined,
		changed: boolean,
		currentTree: Tree<string>,
	) {
		if (!isUndefined(step.value)) {
			const serialized = this.options.serialize(step.value);
			if (currentSerialized !== serialized) {
				changed = true;
				currentTree[TreeKeys.value] = serialized;
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
	): AsyncIterable<FullSetItem<T>> {
		const iterable = treePreOrderBreadthFirstSearch(tree);
		const { keyLevelNodes } = this.options;
		let currentSerialized: string | undefined;
		for (const breadthNode of iterable) {
			const { level } = breadthNode;
			if (level > keyLevelNodes) {
				break;
			}
			const chainedKey = buildKey(breadthNode);
			const release = await this.options.semaphore.acquire(chainedKey);
			try {
				if (level === keyLevelNodes) {
					yield* this.saveFullTreeValue(breadthNode, chainedKey, createValue);
					continue;
				}
				const value = breadthNode[valueSymbol];
				currentSerialized = (await this.storage.get(chainedKey))?.toString();
				const old = this.getStep(currentSerialized, breadthNode, createValue);
				const oldValue = old.value;
				const newValue = value ?? oldValue;
				const step: FullSetItem<T> = {
					...old,
					oldValue,
					value: newValue,
				};
				yield step;
				await this.persistStep(step, currentSerialized, chainedKey);
			} finally {
				dontWait(release);
			}
		}
	}

	private async persistStep(
		step: FullSetItem<T> | Step<T>,
		currentSerialized: string | undefined,
		chainedKey: string,
	) {
		if (!isUndefined(step.value)) {
			const serialized = this.options.serialize(step.value);
			if (currentSerialized !== serialized) {
				await this.storage.set(chainedKey, serialized);
			}
		}
	}

	private getFullSetItem(
		currentTree: Tree<string>,
		breadthNode: TraversalItem<T>,
	) {
		const currentSerialized = currentTree?.[TreeKeys.value];
		const baseLevel = breadthNode.level;
		const node: FullSetItem<T> = {
			oldValue: currentSerialized
				? this.options.deserialize(currentSerialized)
				: undefined,
			value: breadthNode[valueSymbol],
			key: breadthNode.key,
			level: baseLevel,
		};
		return { node, currentSerialized };
	}

	private checkFullSetItemChange(
		item: { node: FullSetItem<T>; currentSerialized: string | undefined },
		changed: boolean,
		currentTree: Tree<string>,
	) {
		const { node, currentSerialized } = item;
		if (node.value !== undefined) {
			const serialized = this.options.serialize(node.value);
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
	): AsyncIterable<FullSetItem<T>> {
		const { [treeRefSymbol]: treeRef } = breadthNode;
		const serializedTree = await this.storage.get(chainedKey);
		const rootTree: Tree<string> = serializedTree
			? JSON.parse(serializedTree)
			: {};
		let currentTree: Tree<string> | undefined = rootTree;
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
				let next: Tree<string> | undefined =
					currentTree[TreeKeys.children][key];
				if (isUndefined(next)) {
					next = currentTree[TreeKeys.children][key] = {};
					const value = createValue(depthNode);
					if (!isUndefined(value)) {
						changed = true;
						next[TreeKeys.value] = this.options.serialize(value);
					}
				}
				currentTree = next;
				stack.push(currentTree);
			} else {
				while (stack.length > level && stack.length > 0) {
					currentTree = stack.pop() as Tree<string>;
				}
			}
			const item = this.getFullSetItem(currentTree, depthNode);
			yield item.node;
			changed = this.checkFullSetItemChange(item, changed, currentTree);
		}

		if (changed) {
			await this.storage.set(chainedKey, JSON.stringify(rootTree));
		}
	}
}
