import React from 'react'
import renderText from './shared/rendertext'
import './css/video.css'

class Video extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			subText: '',
			source: '',
			textColor: null,
			ready: false
		}
	}

	componentDidMount() {
		this.video.autoPlay = false;
		this.video.loop = true;
		this.video.muted = true;

		this.video.addEventListener('error', function(e) {

		});
		
		this.video.addEventListener('canplay', () => {
			this.setState({ready: true});
			this.setCanvasSize();
		});

		this.video.addEventListener('loadedmetadata', function() {
			this.canvas.width = this.video.videoWidth;
			this.canvas.height = this.video.videoHeight;
		}.bind(this));

		this.setCanvasSize();
	}

	setCanvasSize() {
		let vw, vh;

		if(this.state.ready) {
			vw = this.video.videoWidth;
			vh = this.video.videoHeight;
		} else {
			vw = this.props.defaultWidth;
			vh = this.props.defaultHeight;
		}

		const w = this.outerContainer.offsetWidth;
		const p = w / vw;
		const h = vh * p;

		this.container.style.width = w + 'px';
		this.container.style.height = h + 'px';

		this.updateTextCanvas();
	}

	setTextColor(color) {
		this.setState({textColor: color}, () => {
			this.updateTextCanvas();
		});
	}

	setText(text) {
		this.setState({subText: text}, () => {
			this.updateTextCanvas();
		});
	}

	setClip(text, file) {
		this.setState({
			subText: text,
			source: 'video/' + file
		}, () => {
			this.video.play();
		});
	}

	updateTextCanvas() {
		renderText(this.canvas, this.state.subText, {
			stroke: 'black',
			fill: this.state.textColor,
			font: "32px bold Open Sans Condensed",
			textMargin: 20,
			lineHeight: 35
		});
	}

	render() {
		return <div ref={e => this.outerContainer = e} id="video-container">
				<div ref={e => this.container = e}>
					<video ref={video => this.video = video} src={this.state.source} />
					<canvas ref={e => this.canvas = e} />
				</div>
			</div>
	}
}

export default Video;