# Sandstorm
[![Build Status](https://travis-ci.org/alexandrajs/sandstorm.svg?branch=master)](https://travis-ci.org/alexandrajs/sandstorm)
[![Coverage Status](https://coveralls.io/repos/github/alexandrajs/sandstorm/badge.svg?branch=master)](https://coveralls.io/github/alexandrajs/sandstorm?branch=master)
[![Maintainability](https://api.codeclimate.com/v1/badges/3f959333093a6ea6d41a/maintainability)](https://codeclimate.com/github/alexandrajs/sandstorm/maintainability)

## Installation
```bash
$ npm i sandstorm
``` 
## Usage
### Adding new schema
```js
const sandstorm = new Sandstorm();
sandstorm.register("Author", {
	name: {
		type: "String",
		required: true,
		min: 3,
		max: 64
	},
	last_name: {
		type: "String",
		required: true,
		min: 3,
		max: 64
	},
	nick: "String"
});
sandstorm.register("Book", {
	title: {
		type: "String",
		required: true,
		max: 256
	},
	author: {
		type: "Author",
		required: true,
		search: [
			"name",
			"last_name",
			"nick"
		]
	}
});
```
### Creating new models
```js
const book = sandstorm.create("Book");
book.set({title: "The Art of Deception",
	author: {
		last_name: "Mitnick",
		name: "Kevin"
	}
}).then(() => book.save()).then((_id) => {
	console.log("ObjectID of saved book", _id);
}).catch((err) => {
	console.error("Ups", err);
});
```
### Finding documents
```js
sandstorm.find("Book", {"author.name": "Kevin"}).toArray().then((docs) => {
	console.log("Books written by Kevin", docs.map(book => book.title)).join(", ");
}).catch((err) => {
	console.error("Ups", err);
});
```
### Updating
Use `merge` to update only chosen fields or `set` to overwrite whole document
```js
book.merge({title: "The Art of Deception: Controling the Human Element of Security"})
	.then(() => book.save()).then((_id) => {
	console.log("ObjectID of saved book", _id);
}).catch((err) => {
	console.error("Ups", err);
});

```
### Deleting
```js
sandstorm.find("Book", {"author.name": "Kevin"}).toArray()
	.then((docs) => Promise.all(docs.map(book => book.delete())).then(() => {
		console.log("All documents deleted");
	})).catch((err) => {
	console.error("Ups", err);
});
```
