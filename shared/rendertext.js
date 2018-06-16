function renderText(canvas, text, settings) {
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = settings.fill;
	ctx.strokeStyle = settings.stroke;
	ctx.font = settings.font;

	ctx.shadowColor = settings.stroke;
	ctx.shadowBlur = 2;
	ctx.lineWidth = 2;

	const maxWidth = canvas.width - settings.textMargin * 2;
	
	let x = settings.textMargin;
	let words = text.split(' ');
	let lines = [];
	let line = [];

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	for(let word of words) {
		let m = ctx.measureText(word);
		if(x + m.width + settings.textMargin >= maxWidth) {
			lines.push({
				width: x - settings.textMargin,
				line: line.join(' ')
			});
			line = [];
			x = settings.textMargin;
		} else {
			x += ctx.measureText(' ').width;
		}

		x += m.width;

		line.push(word);
	}

	lines.push({
		width: x - settings.textMargin,
		line: line.join(' ')
	});

	let y = canvas.height - 15;
	for(let i = lines.length - 1; i >= 0; i--) {
		let line = lines[i];

		const x = canvas.width / 2;

		ctx.textAlign = "center";
		ctx.strokeText(line.line, x, y - 3);
		ctx.fillText(line.line, x, y - 3);	

		y -= settings.lineHeight;
	}

	return y - settings.lineHeight + 5;
}

if(typeof module !== 'undefined') {
	module.exports = renderText;
}