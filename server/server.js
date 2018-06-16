'use strict';


if(process.argv.length < 3) {
	console.log('Missing argument: dir');

	process.exit(1);
}

const fs = require('fs');
const path = require('path');

const express = require('express'),
	WebSocketServer = require('websocket').server,
	http = require('http');

const FText = require('./ftext'),
	Client = require('./client');

const app = express(),
	server = http.createServer(app),
	port = process.env.PORT || 8080;

const tmpDir = path.join(__dirname, '../tmp');
const sharedDir = path.join(__dirname, '../shared');
const buildDir = path.join(__dirname, '../build');

app.use(express.static(tmpDir));
app.use(express.static(sharedDir));

if(process.env.NODE_ENV === 'production') {
	app.use(express.static(buildDir));

	app.get('/', (req, res) => {
		res.sendFile(path.join(buildDir, '/index.html'));
	});
}

app.get('/video/:id', (req, res) => {
	const id = req.params.id;
	const file = path.join(tmpDir, id + '.mp4');

	res.sendFile(file);
});

app.get('/video/:id/download', (req, res) => {
	const id = req.params.id;
	const file = path.join(tmpDir, id + '.mp4');

	res.download(file);
});

app.get('/gif/:id', (req, res) => {
	const id = req.params.id;
	const file = path.join(tmpDir, id + '.gif');

	res.sendFile(file);


	/*
	res.setHeader('Content-disposition', 'attachment; filename=' + id + '.gif');
	res.setHeader('Content-type', 'image/gif');

	

	const filestream = fs.createReadStream(file);
	filestream.pipe(res);*/
});

const ftext = new FText({
	dir: process.argv[2],
	cacheDir: tmpDir,
	subfile_match: 's([0-9]+).e([0-9]+)',
	subfile_match_groups: {season: 1, episode: 2}
});


server.listen(port, () => {
	console.log('Listening on port ' + port);

	ftext.load().then(() => {
	}, (err) => {
		console.log(err);
	});
});

const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

const clientEvents = {
	save: (client, data) => {
		ftext.renderTextOnClip(data).then(id => {
			//ftext.makeGIF(id).then(() => {
				client.send('saved', {
					file: id
				});
			//});
		});
	},

	load: (client, data) => {
		ftext.generateClip(data).then(id => {
			client.send('load', {
				file: id,
				text: ftext.getSub(data.season, data.episode, data.sid).text,
				season: data.season,
				episode: data.episode,
				sid: data.sid
			});
		}, err => {
			console.log(err);
		});
	},

	random: (client) => {
		const random = ftext.random();
		clientEvents.load(client, {
			sid: random.sid,
			season: random.season,
			episode: random.episode
		})
	},

	search: (client, data) => {
		ftext.search(data).then(results => {
			client.send('search-result', results);
		});
	}
};

wsServer.on('request', function(request) {
	const client = new Client(request);

	for(let name in clientEvents) {
		client.on(name, clientEvents[name]);
	}
});




