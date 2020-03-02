let port = window.location.port;

if (process.env.NODE_ENV === 'development') {
	port = 8080;
}

class WebSocketManager {
	constructor() {
		this.connect();
	}

	emit(event, data) {
		if (this.handlers[event]) {
			for (let f of this.handlers[event]) {
				f(data);
			}
		}
	}

	connect() {
		console.log('WS CONNECT', window.location.hostname + ':' + port);

		this.socket = new WebSocket(
			'ws://' + window.location.hostname + ':' + port,
			'ftext'
		);

		this.socket.onerror = function() {
			console.log('Connection Error');
		};

		this.socket.onclose = () => {
			setTimeout(() => {
				this.emit('onClose');
			}, 500);
		};

		this.socket.onopen = e => {
			while (this.socketSendQueue.length > 0) {
				const e = this.socketSendQueue.shift();

				this.send(e.cmd, e.data);
			}
		};

		this.socket.onmessage = e => {
			if (typeof e.data === 'string') {
				const msg = JSON.parse(e.data);
				const func = msg.cmd.replace(/-([a-z])/g, (match, contents) => {
					return contents.toUpperCase();
				});

				this.emit(func, msg.data);
			}
		};

		this.socketSendQueue = [];
		this.handlers = {};
	}

	addHandler(event, fn) {
		if (!this.handlers[event]) {
			this.handlers[event] = [];
		}

		this.handlers[event].push(fn);
	}

	send(cmd, data) {
		if (this.socket.readyState === 1) {
			this.socket.send(
				JSON.stringify({
					cmd: cmd,
					data: data
				})
			);
		} else {
			this.socketSendQueue.push({ cmd, data });
		}
	}
}

module.exports = WebSocketManager;
