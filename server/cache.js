const fs = require('fs');
const crypto = require('crypto');
const util = require('util');
const path = require('path');

class Cache {
	constructor(dir) {
		this.dir = dir;
	}

	_generateCacheKey(data) {
		const hash = crypto.createHash('md5');
		const keys = Object.keys(data).sort();
		
		for(let key of keys) {
			hash.update(data[key].toString().trim());
		}

		return hash.digest('hex');
	}

	filename(key, ext) {
		return util.format('%s.%s', key, ext);
	}

	fullFilename(key, ext) {
		return path.join(this.dir, '/' + this.filename(key, ext));
	}

	get(data, ext) {
		const key = this._generateCacheKey(data);
		const file = this.fullFilename(key, ext);

		return new Promise((resolve, reject) => {
			fs.stat(file, (err) => {
				if(err) {
					reject(key);
				} else {
					resolve(file);
				}
			});
		});
	}
}

module.exports = Cache;