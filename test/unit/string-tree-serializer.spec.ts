import { stringTreeSerializer, Tree, TreeKeys } from '../../src';

describe('strTreeSerializer', () => {
	describe(stringTreeSerializer.serialize.name, () => {
		it('should serialize tree properly', () => {
			const tree: Tree<string> = {
				[TreeKeys.children]: {
					a: {
						v: '11',
						[TreeKeys.children]: {
							b1: {
								[TreeKeys.children]: {
									c1: {
										v: '12',
										[TreeKeys.children]: {
											d1: {
												[TreeKeys.children]: {
													e1: {
														v: '13',
														[TreeKeys.children]: {
															f1: {
																v: '14',
															},
														},
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			};

			const result = stringTreeSerializer.serialize(tree);

			expect(result).toBe('a(11_b1(_c1(12_d1(_e1(13_f1(14))))))');
		});
	});
});
