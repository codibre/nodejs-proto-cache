import { Step } from './tree-type';

export type StepTtl<T> = ((t: Step<T>) => number) | number;

export interface CacheSubItem {
	key: string;
	value?: string;
	subItems?: CacheSubItem[];
}

export interface CacheItem {
	value?: string;
	subItems?: CacheSubItem[];
}
