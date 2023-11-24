import { ChainedObject, Step, Tree, TreeKeys } from '../types';

class StepRef<T> implements Step<T> {
	constructor(
		private treeRef: Tree<T>,
		public key: string,
		public level: number,
		public nodeRef: ChainedObject,
	) {}

	get value(): T | undefined {
		return this.treeRef[TreeKeys.value];
	}
	set value(newValue: T | undefined) {
		this.treeRef[TreeKeys.value] = newValue;
	}
}

/**
 * Set the value for the specified path in the sync tree in memory, calling
 * createValue for each node on the way
 * and yielding each step, allowing edition
 * @param tree Tree to
 * @param path the path to set
 * @param createValue callback to create non existing values
 */
export function* deepTreeSet<T>(
	tree: Tree<T>,
	path: string[],
	createValue?: (level: number) => T | undefined,
): Iterable<Step<T>> {
	let level = 0;
	let nodeRef: ChainedObject | undefined;
	for (const key of path) {
		level++;
		tree[TreeKeys.children] ??= {};
		const newTree = (tree[TreeKeys.children][key] ??= {
			[TreeKeys.value]: createValue?.(level),
		});
		nodeRef = {
			key,
			level,
			parentRef: nodeRef,
		};
		yield new StepRef(newTree, key, level, nodeRef);
		tree = newTree;
	}
}
