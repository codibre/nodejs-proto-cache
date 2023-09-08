export interface Serializer<T> {
	serialize(tree: T): string;
	deserialize(buffer: string): T;
}
