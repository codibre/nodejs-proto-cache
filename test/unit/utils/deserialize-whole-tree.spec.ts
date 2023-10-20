import { Tree, TreeKeys, deserializeWholeTree, EmptyTree } from '../../../src';
import clone from 'clone';

function serializeRecursive(tree: Tree<unknown>) {
	for (const k in tree) {
		if (k in tree) {
			if (k === TreeKeys.value) {
				tree[k] = JSON.stringify(tree[k]);
			} else if (k === TreeKeys.children) {
				const children = tree[k];
				for (const k2 in children) {
					if (k2 in children) {
						const item = children[k2];
						if (item) {
							serializeRecursive(item);
						}
					}
				}
			}
		}
	}
}

function serialize(tree: Tree<unknown>) {
	const clonedTree = clone(tree);
	serializeRecursive(clonedTree);
	return JSON.stringify(clonedTree);
}

const serializer = {
	serialize: JSON.stringify.bind(JSON),
	deserialize: JSON.parse.bind(JSON),
};

describe(deserializeWholeTree.name, () => {
	it('should deserialize tree and values', () => {
		const tree = {
			[TreeKeys.value]: '123',
			[TreeKeys.children]: {
				a: {
					[TreeKeys.value]: 456,
				},
				b: {
					[TreeKeys.value]: { s: '78', n: 9 },
				},
				c: {
					[TreeKeys.value]: true,
					[TreeKeys.children]: {
						d: {
							[TreeKeys.value]: { t: true },
							[TreeKeys.children]: {
								d2: {
									[TreeKeys.value]: 5,
									[TreeKeys.children]: {
										d3: {
											[TreeKeys.children]: {
												d4: {
													[TreeKeys.value]: 7,
												},
											},
										},
									},
								},
							},
						},
					},
				},
				d: {
					[TreeKeys.value]: false,
				},
			},
		};

		const serializedTree = serialize(tree);

		const result = deserializeWholeTree(serializedTree, serializer, serializer);

		expect(result).toEqual(tree);
	});

	it('should throw an error for an empty tree', () => {
		let error: any;

		try {
			deserializeWholeTree(JSON.stringify({}), serializer, serializer);
		} catch (err) {
			error = err;
		}

		expect(error).toBeInstanceOf(EmptyTree);
	});
});
