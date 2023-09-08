import { Tree } from 'src/types';

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
		if (current.v) {
			yield current.v;
		}
		const key = path[level] ?? level;
		if (!current.c) current.c = {};
		let next: Tree<T> | undefined = current.c?.[key];
		if (next === undefined) {
			next = {};
			next.v = createLeaf();
			current.c[key] = next;
		}
		current = next;
	}
	if (current.v) {
		yield current.v;
	}
}
