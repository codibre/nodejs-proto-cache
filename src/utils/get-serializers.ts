import { Serializer } from '..';

const deserialize = JSON.parse.bind(JSON);
const serialize = JSON.stringify.bind(JSON);

export function getSerializers<T>(
	serializer: Serializer<T> | undefined,
): Serializer<T> {
	if (serializer) {
		return {
			serialize: serializer.serialize.bind(serializer),
			deserialize: serializer.deserialize.bind(serializer),
		};
	}
	return { serialize, deserialize };
}
