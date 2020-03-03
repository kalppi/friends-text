const util = require('util'),
	fs = require('fs'),
	path = require('path'),
	renderText = require('../shared/rendertext'),
	Cache = require('./cache'),
	ffmpeg = require('./ffmpeg'),
	EasyTextSearch = require('js-easy-text-search'),
	SubtitleParser = require('./subtitleparser');

const { Canvas } = require('canvas');

const videoFormat = 'mp4';

const pad = (n, len = 2) => {
	return ('000' + n).slice(-len);
};

class FText {
	#loaded = false;

	constructor(options) {
		this.subData = {};
		this.options = options;
		this.cache = new Cache(options.cacheDir);
		this.subParser = new SubtitleParser({
			dir: options.dir + '/subs',
			match: options.subfile_match,
			match_groups: options.subfile_match_groups
		});
	}

	_getInputFile(season, episode) {
		return util.format(
			'Friends.s%s.e%s.mkv',
			pad(season, 2),
			pad(episode, 2)
		);
	}

	_thumbFileName(filename) {
		const basename = path.basename(filename);

		return util.format(
			'thumb_%s.jpg',
			basename.substring(0, basename.lastIndexOf('.'))
		);
	}

	getSub(season, episode, sid) {
		if (!this.loaded) return;

		const seasonObj = this.subtitles.get(season);
		const episodeObj = seasonObj.get(episode);

		return Object.assign(
			{
				season: season,
				episode: episode,
				sid: sid
			},
			episodeObj.get(sid).data
		);
	}

	random() {
		if (!this.loaded) return;

		const season = this.subtitles.getRandomChild();
		const episode = season.getRandomChild();
		const s = episode.getRandomChild();

		return Object.assign(
			{
				season: season.key,
				episode: episode.key,
				sid: s.key
			},
			s.data
		);
	}

	_loadSearch() {
		return new Promise((resolve, reject) => {
			this.subSearch = new EasyTextSearch({
				minLength: 1,
				caseSensitive: false,
				field: 'text',
				wildPrefix: false,
				wildSuffix: true
			});

			for (let season of this.subtitles.getAll()) {
				for (let episode of season.getAll()) {
					for (let s of episode.getAll()) {
						this.subSearch.add({
							season: season.key,
							episode: episode.key,
							sid: s.key,
							text: s.data.text
						});
					}
				}
			}

			for (let k in this.subData) {
				this.subSearch.add(this.subData[k]);
			}

			resolve();
		});
	}

	load() {
		return new Promise((resolve, reject) => {
			console.log('Loading subs...');

			this.subParser.load().then(subs => {
				this.subtitles = subs;

				this.loaded = true;

				this._loadSearch().then(loaded => {
					if (loaded) {
						resolve();
					} else {
						console.log('Done');

						resolve();
					}
				});
			}, console.log);
		});
	}

	search(search) {
		return new Promise((resolve, reject) => {
			const terms =
				search
					.trim()
					.replace(/\s+/g, ' ')
					.replace(/ /g, '+') + '*';

			const rtn = this.subSearch.search(terms, {
				limit: 20,
				sort: (a, b) => {
					if (a.season < b.season) {
						return -1;
					} else if (a.season > b.season) {
						return 1;
					} else {
						if (a.episode < b.episode) {
							return -1;
						} else if (a.episode > b.episode) {
							return 1;
						} else {
							return 0;
						}
					}
				}
			});

			resolve(rtn);
		});
	}

	numberToTextTime(time, includeMs = true) {
		const dd = [[60 * 60 * 1000, 0], [60 * 1000, 0], [1000, 0]];

		for (let d of dd) {
			while (time >= d[0]) {
				time -= d[0];
				d[1]++;
			}
		}

		let rtn = dd
			.map(obj => {
				return pad(obj[1]);
			})
			.join(':');

		if (includeMs) {
			rtn += '.' + pad(time, 3);
		}

		return rtn;
	}

	renderTextOnClip(data) {
		return new Promise((resolve, reject) => {
			if (!this.loaded) {
				reject();
				return;
			}

			this.cache.get(data, videoFormat).then(
				filename => {
					resolve(path.basename(filename, '.' + videoFormat));
				},
				id => {
					const filename = this.cache.fullFilename(id, videoFormat);

					this.generateClip({
						season: data.season,
						episode: data.episode,
						sid: data.sid
					}).then(clipId => {
						const clipFilename = this.cache.fullFilename(
							clipId,
							videoFormat
						);

						this.renderTextImage({
							text: data.text,
							color: data.color
						}).then(textImage => {
							const inputClip = this.cache.fullFilename(
								data,
								videoFormat
							);

							ffmpeg
								.run([
									'-hide_banner',
									'-loglevel',
									'panic',
									'-i',
									clipFilename,
									'-i',
									textImage,
									'-filter_complex',
									'[0:v][1:v] overlay=0:0',
									'-pix_fmt',
									'yuv420p',
									'-an',
									'-r',
									'25',
									filename,
									'-y'
								])
								.then(() => {
									resolve(id);
								});
						});
					});
				}
			);
		});
	}

	makeGIF(id, hq = true) {
		return new Promise((resolve, reject) => {
			if (!this.loaded) {
				reject();
				return;
			}

			const input = this.cache.fullFilename(id, videoFormat);
			const output = this.cache.fullFilename(id, 'gif');

			if (hq) {
				ffmpeg
					.run([
						'-i',
						input,
						'-vf',
						'fps=20,scale=500:-1:flags=lanczos,palettegen=stats_mode=diff',
						output + '.palette.png',
						'-y'
					])
					.then(() => {
						ffmpeg.run([
							'-i',
							input,
							'-i',
							output + '.palette.png',
							'-filter_complex',
							'fps=20,scale=500:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
							output,
							'-y'
						]);
					})
					.then(resolve);
			} else {
				ffmpeg
					.run([
						'-hide_banner',
						'-loglevel',
						'panic',
						'-i',
						input,
						//'-filter_complex', 'palettegen[PAL],[0:v][PAL]paletteuse',
						'-vf',
						'fps=20,scale=500:-1',
						output,
						'-y'
					])
					.then(resolve);
			}
		});
	}

	captureThumbnail(sub, file) {
		return new Promise((resolve, reject) => {
			if (!this.loaded) {
				reject();
				return;
			}

			const ts = this.textTimeToNumber(sub.time_start),
				te = this.textTimeToNumber(sub.time_end);
			const diff = te - ts;
			const halfWayPoint = this.numberToTextTime(diff / 2);

			const out = this._thumbFileName(file);

			const ffmpeg = spawn('ffmpeg', [
				'-hide_banner',
				'-loglevel',
				'panic',
				'-i',
				file,
				'-ss',
				halfWayPoint,
				'-vframes',
				1,
				'tmp/' + out,
				'-y'
			]);

			ffmpeg.stderr.on('data', data => {
				console.log(`stderr: ${data}`);
			});

			ffmpeg.on('close', code => {
				resolve(out);
			});
		});
	}

	renderTextImage(data) {
		return new Promise((resolve, reject) => {
			if (!this.loaded) {
				reject();
				return;
			}

			this.cache.get(data, 'png').then(
				filename => {
					resolve(filename);
				},
				key => {
					const canvas = new Canvas(720, 404);

					renderText(canvas, data.text, {
						stroke: 'black',
						fill: data.color,
						font: '32px bold Open Sans Condensed',
						textMargin: 20,
						lineHeight: 35
					});

					const filename = this.cache.fullFilename(key, 'png'),
						out = fs.createWriteStream(filename),
						stream = canvas.pngStream();

					stream.on('data', function(chunk) {
						out.write(chunk);
					});

					stream.on('end', function(chunk) {
						resolve(filename);
					});
				}
			);
		});
	}

	generateColorMap(fileId) {
		// ffmpeg -i d0a6dde91987bd432f2390403eda3ed0.mp4 -filter:v "select=not(mod(n\,5)),setpts=N/(FRAME_RATE*TB),scale=1:1" -f image2pipe -c:v ppm - | convert +append - -resize 100x50! out.png

		return new Promise((resolve, reject) => {
			if (!this.loaded) {
				reject();
				return;
			}

			this.cache.get({ fileId }, 'map.png').then(
				filename => {
					resolve(path.basename(filename, '.map.png'));
				},
				key => {
					const inputFilename = this.cache.fullFilename(
						fileId,
						'mp4'
					);
					const filename = this.cache.fullFilename(key, 'map.png');

					ffmpeg
						.runAndPipe(
							[
								'-i',
								inputFilename,
								'-filter:v',
								'select=not(mod(n\\,5)),setpts=N/(FRAME_RATE*TB),scale=1:1',
								'-f',
								'image2pipe',
								'-c:v',
								'ppm',
								'-'
							],
							'convert',
							['+append', '-', '-resize', '100x50!', filename]
						)
						.then(() => {
							resolve(path.basename(filename, '.map.png'));
						});
				}
			);
		});
	}

	generateClip(data) {
		return new Promise((resolve, reject) => {
			if (!this.loaded) {
				reject();
				return;
			}

			this.cache.get(data, videoFormat).then(
				filename => {
					resolve(path.basename(filename, '.' + videoFormat));
				},
				key => {
					const sub = this.getSub(
						data.season,
						data.episode,
						data.sid
					);

					const filename = this.cache.fullFilename(key, videoFormat),
						inputFile = util.format(
							this.options.dir + '/data/%s',
							this._getInputFile(data.season, data.episode)
						),
						t = this.numberToTextTime(
							sub.time_end - sub.time_start
						);

					ffmpeg
						.run([
							'-hide_banner',
							'-loglevel',
							'panic',
							'-ss',
							this.numberToTextTime(sub.time_start - 30 * 1000),
							'-i',
							inputFile,
							'-ss',
							'00:00:30',
							'-t',
							t,
							'-c',
							'libx264',
							//'-c', 'libvpx',
							//'-b:v', '1M',
							'-pix_fmt',
							'yuv420p',
							'-an',
							'-preset',
							'veryfast',
							'-crf',
							'22',
							'-r',
							'25',
							filename,
							'-y'
						])
						.then(() => {
							resolve(path.basename(filename, '.' + videoFormat));
						});
				}
			);
		});
	}
}

module.exports = FText;
