const EventEmitter = require('events');

class Client extends EventEmitter {
	constructor(request) {
		super();

		this.con = request.accept('ftext', request.origin);

		this.con.on('message', (msg) => {
			const data = JSON.parse(msg.utf8Data);

			this.emit(data.cmd, this, data.data);
		});
	}

	send(cmd, data) {
		this.con.send(JSON.stringify({
			cmd: cmd,
			data: data
		}));
	}
}

module.exports = Client;