import { Serializer, Tree, TreeKeys } from './types';
import { treePreOrderDepthFirstSearch } from './utils/graphs';

const START_NODE = '(';
const END_NODE = ')';
const FIELD_SEPARATOR = '_';
const ESCAPE = '\\';
const forbiddenStr = [START_NODE, END_NODE, FIELD_SEPARATOR, ESCAPE];
const getRegex = (x: string): RegExp => new RegExp(`\\${x}`, 'g');
const forbiddenRegex = forbiddenStr.map(getRegex);
const replacements = forbiddenStr.map((_, idx) => `\\${idx}`);
const replacementsRegEx = replacements.map(getRegex);

function escape(str: string): string {
	forbiddenRegex.forEach(
		(x, idx) => (str = str.replace(x, replacements[idx] ?? '')),
	);
	return str;
}

export function unescape(str: string): string {
	for (let i = replacementsRegEx.length - 1; i >= 0; i--) {
		const replacementRegEx = replacementsRegEx[i];
		if (!replacementRegEx) continue;
		str = str.replace(replacementRegEx, forbiddenStr[i] ?? '');
	}
	return str;
}

function add(arr: string[], str: string) {
	arr.push(escape(str));
}

export const stringTreeSerializer: Serializer<Tree<string>> = {
	serialize(tree: Tree<string>): string {
		const result: string[] = [];
		let lastLevel = 1;
		for (const { key, value, level, treeRef } of treePreOrderDepthFirstSearch(
			tree,
		)) {
			if (lastLevel < level) {
				lastLevel = level;
			}
			while (lastLevel > level) {
				lastLevel--;
				result.push(END_NODE);
			}
			add(result, key);
			result.push(START_NODE);
			add(result, value ?? '');
			if (treeRef[TreeKeys.children]) {
				result.push(FIELD_SEPARATOR);
			}
		}
		while (lastLevel > 0) {
			lastLevel--;
			result.push(END_NODE);
		}

		return result.join('');
	},
	deserialize(_str: string): Tree<string> {
		throw new Error('Not Implemented yet');
	},
};
