import { getChainedKey } from './utils/get-chained-key';
import {
	FullSetItem,
	KeyTreeCacheOptions,
	KeyTreeCacheStorage,
	Serializer,
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
import { getSerializers } from './utils/get-serializers';

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
		const { deserialize } = getSerializers(this.options.serializer);
		const { keyLevelNodes } = this.options;
		const lastLevelKey = keyLevelNodes - 1;
		const { length } = path;
		let upTo = Math.min(lastLevelKey, length);
		let prevKeys = '';
		let level = 0;
		while (level < upTo) {
			let key: string;
			let chainedKey: string;
			({ key, prevKeys, chainedKey } = getChainedKey(path, level, prevKeys));
			const buffer = await this.storage.get(chainedKey);
			if (!buffer) {
				return;
			}

			level++;
			yield getStep(deserialize, buffer, key, level);
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
					yield getStep(deserialize, v, key, level);
				}
				key = getKey(path, level);
				tree = tree[TreeKeys.children]?.[key];
			}
			if (tree?.[TreeKeys.value]) {
				level++;
				yield getStep(deserialize, tree[TreeKeys.value], key, level);
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
		const { keyLevelNodes, serializer } = this.options;
		const { serialize, deserialize } = getSerializers(serializer);
		const { length } = path;
		let upTo = Math.min(keyLevelNodes - 1, length);
		let currentLevel = previousKeys.length;
		let prevKeys = previousKeys.join(':');
		let chainedKey: string | undefined;
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
			const step = getStep(
				deserialize,
				currentSerialized,
				key,
				currentLevel,
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
				const step = getStep(
					deserialize,
					currentSerialized,
					key,
					currentLevel,
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
			const step = getStep(
				deserialize,
				currentSerialized,
				key,
				currentLevel,
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
		const { serialize, deserialize } = getSerializers(this.options.serializer);
		const valueTreeSerializer = getSerializers(
			this.options.valueTreeSerializer,
		);
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
					valueTreeSerializer,
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
		valueTreeSerializer: Serializer<Tree<string>>,
		createValue: () => T,
	): AsyncIterable<FullSetItem<T>> {
		const { treeRef } = breadthNode;
		const serializedTree = await this.storage.get(chainedKey);
		const rootTree = serializedTree
			? valueTreeSerializer.deserialize(serializedTree)
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
			await this.storage.set(
				chainedKey,
				valueTreeSerializer.serialize(rootTree),
			);
		}
	}
}
