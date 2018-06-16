const colors = ['#ffffff', '#ff0000', '#ffe60a'];

class App {
	constructor() {
		this.canvas = document.createElement('canvas');
		this.canvas.setAttribute('id', 'canvas');
		this.textCanvas = document.createElement('canvas');
		this.textCanvas.setAttribute('id', 'textCanvas');

		this.ctx = this.canvas.getContext('2d');

		this.video = document.createElement('video');
		this.video.autoPlay = false;
		this.video.loop = true;
		this.video.muted = true;
		this.videoContainer = {
			video : this.video,
			ready : false,
		};

		this.video.addEventListener('error', function(e) {

		}.bind(this));
		
		this.video.addEventListener('canplay', function(e) {
			this.videoContainer.scale = Math.min(
				this.canvas.width / this.video.videoWidth, 
				this.canvas.height / this.video.videoHeight); 

			this.videoContainer.ready = true;;

			$('#video-container').css('height', $(this.video).height());
			$('#video-container').css('width', $(this.video).width());

			this.updateTextCanvas();

			requestAnimationFrame(this.updateCanvas.bind(this));
		}.bind(this));

		this.video.addEventListener('loadedmetadata', function() {
			this.canvas.width = this.video.videoWidth;
			this.canvas.height = this.video.videoHeight;

			this.textCanvas.width = this.canvas.width;
			this.textCanvas.height = this.canvas.height;
		}.bind(this));

		this.subText = '';
		this.subList = {};
		this.loaded = null;
		this.socket = new WebSocket('ws://' + window.location.host, 'ftext');

		this.socket.onerror = function() {
			console.log('Connection Error');
		};

		this.socket.onopen = e => {
			while(this.socketSendQueue.length > 0) {
				const e = this.socketSendQueue.shift();

				this.send(e.cmd, e.data);
			}
		};

		this.socket.onmessage = function(e) {
		    if (typeof e.data === 'string') {
		        const msg = JSON.parse(e.data);
		        const func = 'on' +
		        	msg.cmd.charAt(0).toUpperCase() +
		        	msg.cmd.slice(1).replace(/\-([a-z])/g, (match, contents) => {
						return contents.toUpperCase();
					});

				if(this[func]) {
					this[func].call(this, msg.data);
				}

				if(this.handlers[func]) {
					for(let f of this.handlers[func]) {
						f(msg.data);
					}
				}
		    }
		}.bind(this);

		this.socketSendQueue = [];
		this.handlers = {};
		this.textColor = colors[0];
	}

	setColor(color) {
		this.textColor = color;
		this.updateTextCanvas();
	}

	setText(text) {
		this.subText = text;
		this.updateTextCanvas();
	}

	setClip(text, file) {
		this.subText = text;
		this.video.src = 'video/' + file;
		this.video.play();
	}

	updateTextCanvas() {
		renderText(this.textCanvas, this.subText, {
			stroke: 'black',
			fill: this.textColor,
			font: "32px bold Open Sans Condensed",
			textMargin: 20,
			lineHeight: 35
		});
	}

	updateCanvas() {
		if(this.videoContainer !== undefined && this.videoContainer.ready) {
			const scale = this.videoContainer.scale;
			const vidH = this.videoContainer.video.videoHeight;
			const vidW = this.videoContainer.video.videoWidth;
			const top = this.canvas.height / 2 - (vidH /2 ) * scale;
			const left = this.canvas.width / 2 - (vidW /2 ) * scale;

			try {
				this.ctx.drawImage(this.video, 0, 0);
			} catch(e) {
				$('#debug').text(e);
			}
		}

		requestAnimationFrame(this.updateCanvas.bind(this));
	}

	loadList(data) {
		this.subList = data;

		const $list = $('#list').empty();

		$list.append($('<option>'));

		for(let i in data) {
			let $item = $('<option>').text(data[i].text);
			$item.data('sid', data[i].sid);
			$item.data('season', data[i].season);
			$item.data('episode', data[i].episode);

			$list.append($item);
		}

		this.showList();
	}

	addHandler(event, fn) {
		if(!this.handlers[event]) {
			this.handlers[event] = [];
		}

		this.handlers[event].push(fn);
	}

	send(cmd, data) {
		if(this.socket.readyState == 1) {
			this.socket.send(JSON.stringify({
				cmd: cmd,
				data: data
			}));
		} else {
			this.socketSendQueue.push({cmd, data});
		}
	}

	search(keywords) {
		this.send('search', keywords);
	}

	loadClip(season, episode, sid) {
		this.send('load',  {season, episode, sid});
	}

	random() {
		this.send('random');
	}

	save() {
		this.send('save', {
			season: this.loaded.season,
			episode: this.loaded.episode,
			sid: this.loaded.sid,
			text: this.subText,
			color: this.textColor
		});
	}

	onLoad(data) {
		this.loaded = {season: data.season, episode: data.episode, sid: data.sid};

		$('#edit-text').val(data.text);
		$('#edit').show();

		this.setClip(data.text, data.file);
	}

	onSaved(data) {
		document.location = 'http://' + window.location.host + '/video/' + data.file + '/download';
	}

	onSearchResult(data) {
		this.loadList(data);
	}

	hideList() {
		$('#list').hide();
	}

	showList() {
		const $e = $('#list');

		if($e.children().length > 0) {
			$e.show();
		} else {
			$e.hide();
		}
	}
}

let app = null;

$(function() {
	app = new App();

	$('#save').on('click', app.save.bind(app));
	$('#random').on('click', app.random.bind(app));

	//$('#video-container').append(app.canvas).append(app.textCanvas);

	$('#video-container').append(app.video).append(app.textCanvas);


	$('#list').on('click', 'li', function() {
		const sid = $(this).data('sid');
		const season = $(this).data('season');
		const episode = $(this).data('episode');

		app.loadClip(season, episode, sid);

		app.hideList();
	});

	let editTimer = null;
	$('#edit-text').keyup(function() {
		clearTimeout(editTimer);

		const text = $(this).val();

		editTimer = setTimeout(function() {
			app.setText(text);
		}, 300);
	});

	let searchTimer = null;
	let bound = false;

	const changeTextColor = function() {
		const color = $(this).data('color');

		app.setColor(color);
	};

	for(let color of colors) {
		$('#color').append($('<div>').css({background: color}).data('color', color).click(changeTextColor));
	}

	app.loadClip(1, 1, 253);
});