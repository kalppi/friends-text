import path from 'path';
import express from 'express';

export default tmpDir => {
	const route = express.Router();

	route.get('/clip/:id', (req, res) => {
		const id = req.params.id;
		const file = path.join(tmpDir, id + '.mp4');

		res.sendFile(file);
	});

	route.get('/video/:id/download', (req, res) => {
		const id = req.params.id;
		const file = path.join(tmpDir, id + '.mp4');

		res.download(file);
	});

	route.get('/gif/:id/download', (req, res) => {
		const id = req.params.id;
		const file = path.join(tmpDir, id + '.gif');

		res.download(file);
	});

	return route;
};
