import { Serializer } from './serializer';
import { Tree } from './tree-type';

export interface KeyTreeCacheOptions<T> {
	keyLevelNodes: number;
	serializer?: Serializer<T>;
	valueTreeSerializer?: Serializer<Tree<string>>;
}
