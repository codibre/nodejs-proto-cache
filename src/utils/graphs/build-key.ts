import { ChainedObject } from './tree-pre-order-traversal';

export function buildKey<T extends ChainedObject>(breadthNode: T) {
	const keys: string[] = [breadthNode.key];
	let parent = breadthNode.parentRef;
	while (parent) {
		keys.push(parent.key);
		parent = parent.parentRef;
	}
	return keys.reverse().join(':');
}
