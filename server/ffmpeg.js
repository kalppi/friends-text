const spawn = require('child_process').spawn;

class ffmpeg {
	static run(options) {
		return new Promise((resolve, reject) => {
			const ffmpeg = spawn('ffmpeg', options);

			ffmpeg.stdout.on('data', data => {
				console.log(`stdout: ${data}`);
			});

			ffmpeg.stderr.on('data', data => {
				console.log(`stderr: ${data}`);
			});

			ffmpeg.on('close', code => {
				resolve();
			});
		});
	}

	static runAndPipe(optionsA, name, optionsB) {
		return new Promise((resolve, reject) => {
			const ffmpeg = spawn('ffmpeg', optionsA);
			const pipeTo = spawn(name, optionsB);

			ffmpeg.stdout.pipe(pipeTo.stdin);

			pipeTo.stdout.on('data', data => {
				console.log(`stdout: ${data}`);
			});

			pipeTo.stderr.on('data', data => {
				console.log(`stderr: ${data}`);
			});

			pipeTo.on('close', code => {
				resolve();
			});
		});
	}
}

module.exports = ffmpeg;
