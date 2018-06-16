const spawn = require('child_process').spawn;

class ffmpeg {
	static run(options) {
		return new Promise((resolve, reject) => {
			const ffmpeg = spawn('ffmpeg', options);

			ffmpeg.stdout.on('data', (data) => {
				console.log(`stdout: ${data}`);
			});

			ffmpeg.stderr.on('data', (data) => {
				console.log(`stderr: ${data}`);
			});

			ffmpeg.on('close', (code) => {
				resolve();
			});
		});
	}
}

module.exports = ffmpeg;