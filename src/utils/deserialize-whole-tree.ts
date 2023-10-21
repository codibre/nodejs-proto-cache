import { Serializer, Tree, TreeKeys } from '../types';
import { treePreOrderDepthFirstSearch } from './graphs';
import { valueSymbol } from './graphs/graph-types';
import { isUndefined } from './is-undefined';

export class TreeError extends Error {}
export class EmptyTree extends Error {
	constructor() {
		super('Empty tree');
	}
}

/**
 * Given a in memory data of a tree, deserializeWholeTree will perform a tree deserialization and then the deserialization of each value on the tree, returning the completly deserialized tree.
 * This is useful, for example, if you want to create a function to print a tree value for debug purposes, for example.
 * @param data the serialized data of a tree
 * @param treeSerializer the tree serializer
 * @param valueSerializer the value serializer
 * @returns the completely deserialized tree
 */
export function deserializeWholeTree<T, R = string>(
	data: R,
	treeSerializer: Serializer<Tree<R>, R>,
	valueSerializer: Serializer<T, R>,
) {
	const tree = treeSerializer.deserialize(data);
	if (
		isUndefined(tree[TreeKeys.children]) &&
		isUndefined(tree[TreeKeys.value])
	) {
		throw new EmptyTree();
	}
	const rootValue = tree[TreeKeys.value];
	const newTree: Tree<T> = {
		[TreeKeys.value]: rootValue
			? valueSerializer.deserialize(rootValue)
			: undefined,
	};
	const stack: Tree<T>[] = [newTree];
	let currentLevel = 0;

	for (const node of treePreOrderDepthFirstSearch(tree, undefined)) {
		currentLevel++;
		if (currentLevel < node.level) {
			throw new TreeError('Path lost');
		}
		while (currentLevel > node.level) {
			if (stack.length === 0) {
				throw new TreeError('Stack lost');
			}
			stack.pop();
			currentLevel--;
		}
		const currentNode = stack[stack.length - 1] as Tree<T>;
		const map = (currentNode[TreeKeys.children] ??= {});
		const current = (map[node.key] ??= {});
		const value = node[valueSymbol];
		if (!isUndefined(value)) {
			current[TreeKeys.value] = valueSerializer.deserialize(value);
		}
		stack.push(current);
	}

	return newTree;
}
