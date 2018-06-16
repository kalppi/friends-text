const fs = require('fs'),
	util = require('util');

function textTimeToNumber(time) {
	const matches = time.match(/^([0-9]+):([0-9]+):([0-9]+)(?:(?:,|\.)([0-9]+))?$/);
	let [, h, m, s, ms] = matches;

	ms = ms || 0;

	return parseInt(h) * 60 * 60 * 1000 + parseInt(m) * 60 * 1000 + parseInt(s) * 1000 + parseInt(ms);
}

class Subtitle {
	constructor(key, data = null) {
		this.key = key;
		this.data = data;
		this.children = {};
	}

	addChild(key, data) {
		this.children[key] = new Subtitle(key, data);
	}

	get(key) {
		return this.children[key];
	}

	getAll() {
		return Object.values(this.children);
	}

	getOrCreateChild(key) {
		if(!this.children[key]) {
			this.children[key] = new Subtitle(key);
		}

		return this.children[key];
	}

	getRandomChild() {
		const keys = Object.keys(this.children);
		const index = Math.floor(Math.random() * keys.length);

		return Object.values(this.children)[index]; 
	}

	saveSync(file) {
		fs.writeFileSync(file, JSON.stringify(this.children, (key, val) => {
			if(val === null) return undefined;
			else if(key == 'children' && Object.keys(val).length == 0) return undefined;
			return val;
		}, 3));
	}
}

class SubtitleParser {
	constructor(options) {
		this.options = options;
	}

	_parseSub(subtitles, file, data) {
		const m = file.match(new RegExp(this.options.match));
		
		const numbers = m.map(v => {
			return parseInt(v, 10);
		});

		const season = numbers[this.options.match_groups.season];
		const episode = numbers[this.options.match_groups.episode];

		const lines = data.split('\n');
		
		let i = 0;
		while(i < lines.length) {
			const sequenceId = lines[i];

			if(sequenceId) {
				const timeData = lines[i + 1];
				let text = '';
				i += 2;

				while(i < lines.length) {
					text += lines[i].trim() + ' ';
					i++;

					if(lines[i] && lines[i].trim().match(/^[0-9]+$/) !== null) {
						i--;
						break;
					}
				}

				text = text.replace(/<\/?font[^>]*>/ig, '');
				text = text.replace(/^\-/, '');

				text = text.replace('[SINGING]', '');

				const matches = timeData.match(/^([^ ]+)\s+-->\s+(.+)/);

				if(matches !== null) {
					const item = {
						id: season * 10000 + episode * 1000 + sequenceId,
						time_start: textTimeToNumber(matches[1]),
						time_end: textTimeToNumber(matches[2]),
						text: text.trim()
					};

					const seasonObj = subtitles.getOrCreateChild(season);
					const episodeObj = seasonObj.getOrCreateChild(episode);
					episodeObj.addChild(sequenceId, item);
				}
			}

			i++;

		}
	}

	load() {
		return new Promise((resolve, reject) => {
			fs.readdir(this.options.dir, (err, files) => {
				const subtitles = new Subtitle();

				const handleFile = file => {
					return new Promise((resolve, reject) => {
						fs.readFile(file, (err, data) => {
							if(err) {
								reject(err);
							} else {
								this._parseSub(subtitles, file, data.toString());
								resolve();
							}
						});
					});
				}

				const promises = [];
				files.forEach(file => {
					if(file.endsWith('.srt')) {
						promises.push(handleFile(util.format('%s/%s', this.options.dir, file)));
					}
				});

				Promise.all(promises).then(() => {
					resolve(subtitles);
				}, reject);
			})
		}, console.log);
	}
}

module.exports = SubtitleParser;