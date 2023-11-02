import { fluent, fluentObject } from '@codibre/fluent-iterable';
import {
	ChainedObject,
	MultiTree,
	MultiTreeChildren,
	MultiTreeValue,
	Tree,
	TreeKeys,
	TreeValue,
	multiTreeValue,
} from './types';
import { createTraversalItem } from './utils/graphs';
import { getMultiValueFromTrees, isUndefined } from './utils';

export class MultiTreeRef<R> implements MultiTree<R> {
	#emptyChildren = false;
	[TreeKeys.value]?: MultiTreeValue<R>;
	constructor(
		private nodeRef: ChainedObject | undefined,
		value: TreeValue<R> | undefined,
		private trees: Tree<R>[],
	) {
		this[TreeKeys.value] =
			isUndefined(value) ||
			(typeof value === 'object' && value && multiTreeValue in value)
				? value
				: {
						[multiTreeValue]: [value],
				  };
	}

	get [TreeKeys.children](): MultiTreeChildren<R> | undefined {
		if (this.#emptyChildren) {
			return undefined;
		}
		return fluent(this.trees)
			.map((tree) => tree?.[TreeKeys.children])
			.filter()
			.flatMap((x) =>
				fluentObject(x)
					.filter(1)
					.map(([key, tree]) => ({ key, trees: [tree] })),
			)
			.distinct('key', (a, b) => {
				a.trees.push(...b.trees);
				return a;
			})
			.toObject(
				'key',
				({ key, trees }) =>
					new MultiTreeRef<R>(
						createTraversalItem<R>(key, 0, this.nodeRef, this),
						getMultiValueFromTrees(trees),
						trees,
					),
			);
	}

	set [TreeKeys.children](tree: MultiTreeChildren<R> | undefined) {
		if (!isUndefined(tree)) {
			throw new Error('MultiTreeRef only allow setting children to undefined');
		}
		this.#emptyChildren = true;
	}
}
