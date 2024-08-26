import { fluentAsync } from '@codibre/fluent-iterable';
import { DefaultOptions } from './options-types';

const defaultSerializer = {
	deserialize: JSON.parse.bind(JSON),
	serialize: JSON.stringify.bind(JSON),
};

export const defaultOptions: DefaultOptions<unknown, unknown> = {
	valueSerializer: defaultSerializer,
	treeSerializer: defaultSerializer,
	semaphore: {
		acquire: async () => async () => undefined,
	},
	multiTreeSelector: (value) => fluentAsync(value).filter().toArray(),
};
