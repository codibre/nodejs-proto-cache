[![Actions Status](https://github.com/Codibre/nodejs-tree-key-cache/workflows/build/badge.svg)](https://github.com/Codibre/nodejs-tree-key-cache/actions)
[![Actions Status](https://github.com/Codibre/nodejs-tree-key-cache/workflows/test/badge.svg)](https://github.com/Codibre/nodejs-tree-key-cache/actions)
[![Actions Status](https://github.com/Codibre/nodejs-tree-key-cache/workflows/lint/badge.svg)](https://github.com/Codibre/nodejs-tree-key-cache/actions)
[![Test Coverage](https://api.codeclimate.com/v1/badges/65e41e3018643f28168e/test_coverage)](https://codeclimate.com/github/Codibre/tree-key-cache/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/65e41e3018643f28168e/maintainability)](https://codeclimate.com/github/Codibre/nodejs-tree-key-cache/maintainability)
[![npm version](https://badge.fury.io/js/tree-key-cache.svg)](https://badge.fury.io/js/tree-key-cache)

A library for highly space efficient Tree cache


## How to Install

```
npm i tree-key-cache
```

## How to use it


First, you need to have a [KeyCacheStorage](./src/types/key-tree-cache-storage.ts) implementation to set where the tree must be persisted. Usually, a simple redis implementation is good enough, like this:

```ts
const redis = new Redis(port, host, {
  db: 1,
});

const storage: TreeKeyCacheStorage<string> = {
  async get(key: string) {
    return redis.get(key);
  }
  async set(key: string, value: string, ttl?: number) {
    return ttl ? redis.setex(key, ttl, value) : redis.set(key, value);
  }
  async getCurrentTtl(key: string) {
    return redis.ttl(key);
  }
}
```

Notice that tree-key-cache works with **ttl in seconds**, just like redis but not necessarily like some other storage service.
Now, with the storage ready, you can instantiate the cache:

```ts
const treeKeyCache = new TreeKeyCache<MyEntity>(storage, {
  keyLevelNodes: 4,
});
```

Notice that we set keyLevelNodes option as 4. This is a required option and is deeply connected with how TreeKeyCache storage persist the data:
* Part of the data goes like simple key-value items, this part we call **key level node**;
* Part of the data is stored in a tree structure, which we call **tree level node**;

The option **keyLevelNodes** states the maximum tree level which we'll keep the data as key, meaning that, starting from that point, everything will be saved as a whole tree in the storage.
This strategy really helps to save a lot of memory, but comes with a trade-off: The sequence of keys selected must be very well planned.

Each node of the tree managed by **tree-key-cache** have an id, which we call **key**, and we use it to access the node in what we call **tree-path**, or **branch**. For example, let's say we want to access the key **rootKey1 > subKey1 > nextSubKey1**, we can easily access it like this:

```ts
const value = await treeKeyCache.getNode(['rootKey1', 'subKey1', 'nextSubKey1']);
```

This will directly returns a **Step** object, if there is a value in it, which will look like this:

```ts
{
  "key": "nextSubKey1",
  "level": 3,
  "value": "persisted value of any type you want",
  "nodeRef": { /* Here we'll have an object that represents the path to that node */ }
}
```

If no values exists that the end of the path, **undefined** is returned. If you want to have a string representing the whole path, you can get it like this:

```ts
const fullKey = buildKey(value.nodeRef); // Will result in 'rootKey1:subKey1:nextSubKey1'
```

Another way to access a node is through the method **iteratePath**. With this one, you get an async iterable that will yield every node up to the last one in the path:

```ts
const iterable = treeKeyCache.iteratePath(['rootKey1', 'subKey1', 'nextSubKey1']);
for await (const step of iterable) {
  if (step.value) {
    console.log(step);
  }
}
```

To set a node value, you have two options:

**setNode**
```ts
await treeKeyCache.setNode(['rootKey1', 'subKey1', 'nextSubKey1'], 'the value you want');
```

With this option, only the value at the end of the path will be set to the value you wanted.

**deepTreeSet**
```ts
const iterable = treeKeyCache.deepTreeSet(['rootKey1', 'subKey1', 'nextSubKey'], () => 'initial value');

for await (const step of iterable) {
  if (step.level === 2) {
    step.value = 'different value';
  }
}
```

With this option, every node on the path is set. The second parameter determines a default value to be assumed, if no value for the node is set yet, but, the catch is that the method returns an async iterable, and you can modify the value of the node before saving it.
You can also use this method without specifying a default value:

```ts
const iterable = treeKeyCache.deepTreeSet(['rootKey1', 'subKey1', 'nextSubKey']);

for await (const step of iterable) {
  if (step.level === 2) {
    step.value = 'the only value';
  }
}
```

This way, only the values to be set will be the ones that you specified during the iteration.

## Application examples

You can use tree-key-cache to count how many people you have for some criteria. Let's say the **keyLevelNodes** for the following example is 4. Let's create a function that returns a path for a given person entity:

```ts
function getPath(person: Person) {
  return [
    person.country,
    person.state,
    person.city,
    person.birthDay.getUTCFullYear(),
    person.birthDay.getUTCMonth(),
    person.birthDay.getUTCDay(),
  ];
}
```

Now, let's process a database to categorize all people we have registered.

```ts
for (const person of people) {
  const iterable = treeKeyCache.deepTreeSet(getPath(person));
  for await (const step of iterable) {
    step.value ??= 0;
    step.value++;
  }
}
```

At the end of the iteration, you'll have in your storage the total count of people:
* By country;
* By state;
* By city;
* By year of birth;
* By month of birth;
* By birthday;

In this example, we used **keyLevelNodes** as 4, for a pretty good reason: the maximum number of tree level nodes will be only 366, which are the maximum number of days in a year. This is very important because, the tree will be entirely loaded to memory when needed, so, always keep that in mind when planning your path sequence, and the keyLevelNodes value.

## Depth and breadth first search

Without any additional effort you can perform a **depth first search** or **breadth first search** starting at any tree level node. Let's take the people data tree example:

```ts
const iterable = treeKeyCache.preOrderDepthFirstSearch(['Brazil', 'Sao Paulo', 'Barueri', '1985']);

for await (const step of iterable) {
  if (step.value !== undefined) {
    console.log(`for ${buildKey(step.nodeRef)} we have ${step.value} people!`);
  }
}
```

You can also do that at a **key level node**, but you'll need to have the method **getChildren** implemented on your storage. This method must me capable of return every child key for a given key with not a tree persisted.
Optionally, you can also implement the method **registerChild**, that will be called every time a child for a given key is set. This is useful to keep track of the children being included for a given node.

Likewise, you can perform a **breadth first search** using the method **preOrderBreadthFirstSearch** with the same conditions.

The exclusion of no longer existing children references must be, for now, be managed by the storage implementation itself.


## randomIterate

You can also implement the method randomIterate, which must return an AsyncIterable that yields every key in the storage. This method may also receive a pattern string to filter the keys. Implementing this method will give the capability of use the **randomIterate** method for the treeKeyCache instance.

## reprocessAllKeyLevelChildren

This method, when called, can recreate all key level children registration within the storage. To use it, you must implement **randomIterate** and **registerChild**. Additionally, if you implement **clearAllChildrenRegistry**, this method will, first, clear all children registration and only then will create them.

## Custom serializers

By default, tree-key-cache uses JSON to serialize and deserialize either values or trees to be saved on redis, but you can achieve an even greater memory saving by using a custom binary serializer.
You can implement your own, by this:

* For value serializers, implement **Serializer<YourValueType, YourStorageType>**
* For tree serializers, implement: **Serializer<Tree<YourStorageType>, YourStorageType>**

**Serializer** is an interface used for both cases, and, after implementing your own custom serializer, you can inform them during the instance creation:

```ts
const treeKeyCache = new TreeKeyCache<YourValueType, YourStorageType>(storage, {
  keyLevelNodes: 4,
  treeSerializer: myCustomTreeSerializerInstance,
  valueSerializer: myCustomValueSerializerInstance
});
```

We also have implemented two custom serializers for some really popular binary formats:

* [@tree-key-cache/avro](https://www.npmjs.com/package/@tree-key-cache/avro): A serializer that targets avro data to be saved on the storage.
This is a really compact binary format that offers a partially easy payload evolution, as you need to inform older payload versions to do so. Use this to achieve one of the maximum storage economy possible;

* [@tree-key-cache/protobuf](https://www.npmjs.com/package/@tree-key-cache/protobuf): A serializer that targets protobuf data to be saved on the storage.
This is also a compact format, not so much compared to avro during our own tests, but it offers a more flexible payload evolution, as the retro-compatibility is automatically when evolving the proto file.

## License

Licensed under [MIT](https://en.wikipedia.org/wiki/MIT_License).
