import { getChainedKey } from './utils/get-chained-key';
import {
	ChainedObject,
	FullSetItem,
	KeyTreeCacheOptions,
	KeyTreeCacheStorage,
	Step,
	Tree,
	TreeKeys,
} from './types';
import { getKey, getStep, getFullSetItem } from './utils';
import {
	treePreOrderBreadthFirstSearch,
	treePreOrderDepthFirstSearch,
} from './utils/graphs';
import { buildKey } from './utils/graphs/build-key';
import { TraversalItem } from './utils/graphs/tree-pre-order-traversal';
import { checkFullSetItemChange } from './utils/graphs/check-full-set-item-change';

const defaultDeserialize = JSON.parse.bind(JSON);
const defaultSerialize = JSON.stringify.bind(JSON);

export class TreeKeyCache<T> {
	constructor(
		private storage: KeyTreeCacheStorage,
		private options: KeyTreeCacheOptions<T>,
	) {}

	/**
	 * Create a iterator that yields each value of the provided path
	 * @param path The path to be traversed
	 */
	async *iteratePath(path: string[]): AsyncIterable<Step<T>> {
		const deserialize: (item: string) => T =
			this.options.deserialize ?? defaultDeserialize;
		const { keyLevelNodes } = this.options;
		const lastLevelKey = keyLevelNodes - 1;
		const { length } = path;
		let upTo = Math.min(lastLevelKey, length);
		let prevKeys = '';
		let level = 0;
		let nodeRef: ChainedObject | undefined;
		while (level < upTo) {
			let key: string;
			let chainedKey: string;
			({ key, prevKeys, chainedKey } = getChainedKey(path, level, prevKeys));
			const buffer = await this.storage.get(chainedKey);
			if (!buffer) {
				return;
			}

			level++;
			nodeRef = { key, parentRef: nodeRef };
			yield getStep(deserialize, buffer, key, level, nodeRef);
		}

		if (length > level) {
			const keyInfo = getChainedKey(path, lastLevelKey, prevKeys);
			let { key } = keyInfo;
			const buffer = await this.storage.get(keyInfo.chainedKey);
			if (!buffer) {
				return;
			}
			let tree: Tree<string> | undefined = JSON.parse(buffer);
			upTo = length - 1;
			while (level < upTo) {
				if (!tree) break;
				const { [TreeKeys.value]: v } = tree;
				level++;
				if (v) {
					nodeRef = { key, parentRef: nodeRef };
					yield getStep(deserialize, v, key, level, nodeRef);
				}
				key = getKey(path, level);
				tree = tree[TreeKeys.children]?.[key];
			}
			if (tree?.[TreeKeys.value]) {
				level++;
				nodeRef = { key, parentRef: nodeRef };
				yield getStep(deserialize, tree[TreeKeys.value], key, level, nodeRef);
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
		createValue: () => T,
		previousKeys: string[] = [],
	): AsyncIterable<Step<T>> {
		const { keyLevelNodes } = this.options;
		const deserialize: (stringified: string) => T =
			this.options.deserialize ?? defaultDeserialize;
		const serialize: (stringified: T) => string =
			this.options.serialize ?? defaultSerialize;
		const { length } = path;
		let upTo = Math.min(keyLevelNodes - 1, length);
		let currentLevel = previousKeys.length;
		let prevKeys = previousKeys.join(':');
		let chainedKey: string | undefined;
		let nodeRef: ChainedObject | undefined;
		let key = '';
		while (currentLevel < upTo) {
			({ prevKeys, chainedKey, key } = getChainedKey(
				path,
				currentLevel,
				prevKeys,
			));
			const currentSerialized = (
				await this.storage.get(chainedKey)
			)?.toString();
			currentLevel++;
			nodeRef = { key, parentRef: nodeRef };
			const step = getStep(
				deserialize,
				currentSerialized,
				key,
				currentLevel,
				nodeRef,
				createValue,
			);
			yield step;
			const serialized = serialize(step.value);
			if (currentSerialized !== serialized) {
				await this.storage.set(chainedKey, serialized);
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
			const buffer = await this.storage.get(chainedKey);
			const rootTree: Tree<string> = buffer ? JSON.parse(buffer) : {};
			let currentTree = rootTree;
			let changed = false;
			upTo = length - 1;
			while (currentLevel < upTo) {
				const currentSerialized = currentTree[TreeKeys.value];
				currentLevel++;
				nodeRef = { key, parentRef: nodeRef };
				const step = getStep(
					deserialize,
					currentSerialized,
					key,
					currentLevel,
					nodeRef,
					createValue,
				);
				yield step;
				const serialized = serialize(step.value);
				if (currentSerialized !== serialized) {
					changed = true;
					currentTree[TreeKeys.value] = serialized;
				}
				key = getKey(path, currentLevel);
				currentTree[TreeKeys.children] ??= {};
				let nextTree = currentTree[TreeKeys.children][key];
				if (!nextTree) {
					nextTree = currentTree[TreeKeys.children][key] = {};
					changed = true;
				}
				currentTree = nextTree;
			}
			const currentSerialized = currentTree[TreeKeys.value];
			nodeRef = { key, parentRef: nodeRef };
			const step = getStep(
				deserialize,
				currentSerialized,
				key,
				currentLevel,
				nodeRef,
				createValue,
			);
			yield step;
			const serialized = serialize(step.value);
			if (currentSerialized !== serialized) {
				changed = true;
				currentTree[TreeKeys.value] = serialized;
			}
			if (changed) {
				await this.storage.set(chainedKey, JSON.stringify(rootTree));
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
		createValue: () => T,
	): AsyncIterable<FullSetItem<T>> {
		const iterable = treePreOrderBreadthFirstSearch(tree);
		const { keyLevelNodes } = this.options;
		const deserialize: (stringified: string) => T =
			this.options.deserialize ?? defaultDeserialize;
		const serialize: (stringified: T) => string =
			this.options.serialize ?? defaultSerialize;
		let currentSerialized: string | undefined;
		for (const breadthNode of iterable) {
			const { level } = breadthNode;
			if (level > keyLevelNodes) {
				break;
			}
			const { key } = breadthNode;
			const chainedKey = buildKey(breadthNode);
			if (level === keyLevelNodes) {
				yield* this.saveFullTreeValue(
					breadthNode,
					chainedKey,
					serialize,
					deserialize,
					createValue,
				);
				continue;
			}
			const value = breadthNode.value;
			currentSerialized = (await this.storage.get(chainedKey))?.toString();
			const old = getStep(
				deserialize,
				currentSerialized,
				key,
				level,
				breadthNode,
				createValue,
			);
			const oldValue = old.value;
			const newValue = value ?? oldValue;
			const step: FullSetItem<T> = {
				...old,
				oldValue,
				value: newValue,
			};
			yield step;
			const serialized = serialize(newValue);
			if (currentSerialized !== serialized) {
				await this.storage.set(chainedKey, serialized);
			}
		}
	}

	private async *saveFullTreeValue(
		breadthNode: TraversalItem<T>,
		chainedKey: string,
		serialize: (payload: T) => string,
		deserialize: (stringified: string) => T,
		createValue: () => T,
	): AsyncIterable<FullSetItem<T>> {
		const { treeRef } = breadthNode;
		const serializedTree = await this.storage.get(chainedKey);
		const rootTree: Tree<string> = serializedTree
			? JSON.parse(serializedTree)
			: {};
		let currentTree: Tree<string> | undefined = rootTree;
		const stack = [];
		let changed = false;
		const rootItem = getFullSetItem(currentTree, breadthNode, deserialize);
		yield rootItem.node;
		changed = checkFullSetItemChange(rootItem, changed, serialize, currentTree);
		for (const depthNode of treePreOrderDepthFirstSearch(treeRef)) {
			const { level, key } = depthNode;
			if (stack.length < level) {
				if (!currentTree) {
					throw new Error('Algorithm error');
				}
				currentTree[TreeKeys.children] ??= {};
				let next: Tree<string> | undefined =
					currentTree[TreeKeys.children][key];
				if (next === undefined || next === null) {
					changed = true;
					next = currentTree[TreeKeys.children][key] = {
						v: serialize(createValue()),
					};
				}
				currentTree = next;
				stack.push(currentTree);
			} else {
				while (stack.length > level && stack.length > 0) {
					currentTree = stack.pop() as Tree<string>;
				}
			}
			const item = getFullSetItem(currentTree, depthNode, deserialize);
			yield item.node;
			changed = checkFullSetItemChange(item, changed, serialize, currentTree);
		}

		if (changed) {
			await this.storage.set(chainedKey, JSON.stringify(rootTree));
		}
	}
}
