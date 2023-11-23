import { Tree, TreeKeys, deepTreeSet } from 'src/index';

describe(deepTreeSet.name, () => {
	it('should set and yield the node steps, accepting step editing', () => {
		const tree: Tree<number> = {
			[TreeKeys.children]: {
				a: {
					[TreeKeys.value]: 1,
					[TreeKeys.children]: {
						b: {
							[TreeKeys.value]: 2,
						},
						c: {
							[TreeKeys.value]: 3,
							[TreeKeys.children]: {
								d: {
									[TreeKeys.value]: 4,
								},
								e: {
									[TreeKeys.value]: 5,
								},
							},
						},
					},
				},
			},
		};

		const iterable = deepTreeSet(tree, ['a', 'c', 'e', 'f'], () => 0);
		for (const step of iterable) {
			if (step.value !== undefined && step.value !== 4) {
				step.value++;
			}
		}

		expect(tree).toEqual({
			[TreeKeys.children]: {
				a: {
					[TreeKeys.value]: 2,
					[TreeKeys.children]: {
						b: {
							[TreeKeys.value]: 2,
						},
						c: {
							[TreeKeys.value]: 4,
							[TreeKeys.children]: {
								d: {
									[TreeKeys.value]: 4,
								},
								e: {
									[TreeKeys.value]: 6,
									[TreeKeys.children]: {
										f: {
											[TreeKeys.value]: 1,
										},
									},
								},
							},
						},
					},
				},
			},
		});
	});
});
