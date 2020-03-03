import React from 'react';

export default class ColorMap extends React.Component {
	state = {
		width: 0,
		currentTime: 0
	};

	ref = React.createRef();

	componentDidMount() {
		this.setState({
			width: this.ref.current.offsetWidth
		});

		setInterval(() => {
			if (this.props.video) {
				this.setState({
					currentTime:
						this.props.video.currentTime / this.props.video.duration
				});
			}
		}, 1000 / 60);
	}

	render() {
		const { currentTime, width } = this.state;

		return (
			<div id="map" ref={this.ref}>
				<div
					id="pos"
					style={{
						transform: `translateX(${Math.round(
							currentTime * width
						)}px)`
					}}
				/>
				<img src={'/api/map/' + this.props.id} />
			</div>
		);
	}
}
