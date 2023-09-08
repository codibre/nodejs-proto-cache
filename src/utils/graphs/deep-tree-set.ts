import { Tree, TreeKeys } from '../../types';

/**
 * Follow specified path in the tree, creating each non existing node on the way
 * @param tree The tree to go through
 * @param path the path to be followed
 * @param createLeaf A function to create the values for non existing nodes
 * @returns An iterable with every node in the path
 */
export function* deepTreeSet<T>(
	tree: Tree<T>,
	path: string[],
	createLeaf: () => T,
): Iterable<T> {
	let current: Tree<T> = tree;
	for (let level = 0; level < path.length; level++) {
		if (current[TreeKeys.value]) {
			yield current[TreeKeys.value];
		}
		const key = path[level] ?? level;
		if (!current[TreeKeys.children]) current[TreeKeys.children] = {};
		let next: Tree<T> | undefined = current[TreeKeys.children]?.[key];
		if (next === undefined) {
			next = {};
			next[TreeKeys.value] = createLeaf();
			current[TreeKeys.children][key] = next;
		}
		current = next;
	}
	if (current[TreeKeys.value]) {
		yield current[TreeKeys.value];
	}
}
