import { Serializer, Tree, TreeKeys } from '../types';
import { treePreOrderDepthFirstSearch } from './graphs';
import { valueSymbol } from './graphs/tree-pre-order-traversal';
import { isUndefined } from './is-undefined';

export class TreeError extends Error {}
export class EmptyTree extends Error {
	constructor() {
		super('Empty tree');
	}
}

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

	for (const node of treePreOrderDepthFirstSearch(tree)) {
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
