class WebSocketManager {
	constructor() {
		this.socket = new WebSocket('ws://' + window.location.hostname + ':8080', 'ftext');

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
		        const func =
		        	msg.cmd.replace(/-([a-z])/g, (match, contents) => {
						return contents.toUpperCase();
					});

				if(this.handlers[func]) {
					for(let f of this.handlers[func]) {
						f(msg.data);
					}
				}
		    }
		}.bind(this);

		this.socketSendQueue = [];
		this.handlers = {};
	}

	addHandler(event, fn) {
		if(!this.handlers[event]) {
			this.handlers[event] = [];
		}

		this.handlers[event].push(fn);
	}

	send(cmd, data) {
		if(this.socket.readyState === 1) {
			this.socket.send(JSON.stringify({
				cmd: cmd,
				data: data
			}));
		} else {
			this.socketSendQueue.push({cmd, data});
		}
	}
}

module.exports = WebSocketManager;