'use strict';

if (process.argv.length < 3) {
	console.log('Missing argument: dir');

	process.exit(1);
}

import fs from 'fs';
import path from 'path';
import express from 'express';
import http from 'http';
import { server as WebSocketServer } from 'websocket';
import { Subject } from 'rxjs';

import httpApi from './api/httpApi';
import GeneralApi from './api/generalApi';
import FText from './ftext';

const app = express(),
	server = http.createServer(app),
	port = process.env.PORT || 8080;

const tmpDir = path.join(__dirname, '../tmp');

app.use('/api', httpApi(tmpDir));

if (!fs.existsSync(tmpDir)) {
	fs.mkdirSync(tmpDir);
}

const sharedDir = path.join(__dirname, '../shared');
const buildDir = path.join(__dirname, '../build');

// app.use(express.static(tmpDir));
// app.use(express.static(sharedDir));

if (process.env.NODE_ENV === 'production') {
	app.use(express.static(buildDir));

	app.get('/', (req, res) => {
		res.sendFile(path.join(buildDir, '/index.html'));
	});
}

const ftext = new FText({
	dir: process.argv[2],
	cacheDir: tmpDir,
	subfile_match: 's([0-9]+).e([0-9]+)',
	subfile_match_groups: { season: 1, episode: 2 }
});

server.listen(port, () => {
	console.log('Listening on port ' + port);

	ftext.load().then(
		() => {},
		err => {
			console.log(err);
		}
	);
});

const wsServer = new WebSocketServer({
	httpServer: server,
	autoAcceptConnections: false
});

function originIsAllowed(origin) {
	return true;
}

wsServer.on('request', function(request) {
	if (!originIsAllowed(request.origin)) {
		request.reject();
		return;
	}

	const con = request.accept('ftext', request.origin);

	con.on('message', msg => {
		const { cmd, data } = JSON.parse(msg.utf8Data);

		const eventBus = new Subject();
		const api = new GeneralApi(eventBus, ftext);

		eventBus.subscribe(message => {
			con.send(JSON.stringify(message));
		});

		if (api[cmd]) {
			api[cmd](data);
		}
	});
});
