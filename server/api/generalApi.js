export default class GeneralApi {
	constructor(eventBus, ftext) {
		this.eventBus = eventBus;
		this.ftext = ftext;
	}

	download(data) {
		const { id, format } = data;
		const file = path.join(tmpDir, id + '.' + format);

		fs.readFile(file, data => {
			this.eventBus.next({ cmd: 'file', data: data.toString('base64') });
		});
	}

	save(data) {
		this.ftext.renderTextOnClip(data).then(id => {
			this.eventBus.next({ cmd: 'saved', data: { file: id } });
		});
	}

	load(data) {
		this.ftext.generateClip(data).then(
			id => {
				this.ftext.generateColorMap(id).then(mapId => {
					this.eventBus.next({
						cmd: 'load',
						data: {
							file: id,
							map: mapId,
							text: this.ftext.getSub(
								data.season,
								data.episode,
								data.sid
							).text,
							season: data.season,
							episode: data.episode,
							sid: data.sid
						}
					});
				});
			},
			err => {
				console.log(err);
			}
		);
	}

	random() {
		const random = this.ftext.random();

		this.load({
			sid: random.sid,
			season: random.season,
			episode: random.episode
		});
	}

	search(data) {
		this.ftext.search(data).then(results => {
			this.eventBus.next({ cmd: 'search-result', data: results });
		});
	}
}
