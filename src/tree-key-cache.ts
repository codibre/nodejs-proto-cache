import { getChainedKey } from './utils/get-chained-key';
import { KeyTreeCacheOptions, KeyTreeCacheStorage, Step, Tree } from './types';
import { getKey, getStep } from './utils';

const defaultDeserialize = JSON.parse.bind(JSON);
const defaultSerialize = JSON.stringify.bind(JSON);

export class TreeKeyCache<T> {
	constructor(
		private storage: KeyTreeCacheStorage,
		private options: KeyTreeCacheOptions<T>,
	) {}

	async *iteratePath(keys: string[]): AsyncIterable<Step<T>> {
		const deserialize: (item: string) => T =
			this.options.deserialize ?? defaultDeserialize;
		const { keyLevelNodes } = this.options;
		const lastLevelKey = keyLevelNodes - 1;
		const { length } = keys;
		let upTo = Math.min(lastLevelKey, length);
		let prevKeys = '';
		let level = 0;
		while (level < upTo) {
			let key: string;
			let chainedKey: string;
			({ key, prevKeys, chainedKey } = getChainedKey(keys, level, prevKeys));
			const buffer = await this.storage.get(chainedKey);
			if (!buffer) {
				return;
			}

			level++;
			yield getStep(deserialize, buffer, key, level);
		}

		if (length > level) {
			const keyInfo = getChainedKey(keys, lastLevelKey, prevKeys);
			let { key } = keyInfo;
			const buffer = await this.storage.get(keyInfo.chainedKey);
			if (!buffer) {
				return;
			}
			let tree: Tree<string> | undefined = JSON.parse(buffer);
			upTo = length - 1;
			while (level < upTo) {
				if (!tree) break;
				const { v } = tree;
				level++;
				if (v) {
					yield getStep(deserialize, v, key, level);
				}
				key = getKey(keys, level);
				tree = tree.c?.[key];
			}
			if (tree?.v) {
				level++;
				yield getStep(deserialize, tree.v, key, level);
			}
		}
	}

	async *deepTreeSet(
		path: string[],
		createLeaf: () => T,
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
				createLeaf,
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
				const currentSerialized = currentTree.v;
				currentLevel++;
				const step = getStep(
					deserialize,
					currentSerialized,
					key,
					currentLevel,
					createLeaf,
				);
				yield step;
				const serialized = serialize(step.value);
				if (currentSerialized !== serialized) {
					changed = true;
					currentTree.v = serialized;
				}
				key = getKey(path, currentLevel);
				currentTree.c ??= {};
				let nextTree = currentTree.c[key];
				if (!nextTree) {
					nextTree = currentTree.c[key] = {};
					changed = true;
				}
				currentTree = nextTree;
			}
			const currentSerialized = currentTree.v;
			const step = getStep(
				deserialize,
				currentSerialized,
				key,
				currentLevel,
				createLeaf,
			);
			yield step;
			const serialized = serialize(step.value);
			if (currentSerialized !== serialized) {
				changed = true;
				currentTree.v = serialized;
			}
			if (changed) {
				await this.storage.set(chainedKey, JSON.stringify(rootTree));
			}
		}
	}
}
