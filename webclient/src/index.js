import React from 'react';
import ReactDOM from 'react-dom';
import './css/style.css';
import WebSocketManager from './websocketmanager';
import Video from './Video';
import Search from './Search';
import ColorMap from './ColorMap';

const Colors = ({ colors, onClick }) => {
	return (
		<div id="color">
			{colors.map((color, index) => {
				return (
					<div
						key={index}
						style={{ background: color }}
						onClick={() => {
							onClick(color);
						}}
					/>
				);
			})}
		</div>
	);
};

const Button = ({ id, text, onClick, disabled }) => {
	return (
		<button
			id={id}
			className="btn btn-primary"
			onClick={onClick}
			disabled={disabled}
		>
			{text}
		</button>
	);
};

class App extends React.Component {
	state = {
		videoVisible: false,
		loaded: {},
		load: {
			season: 1,
			episode: 1,
			sid: 265
		},
		subText: '',
		mapId: null,
		buttonsEnabled: true,
		video: null,
		currentTime: 0,
		searchResults: []
	};

	componentDidMount() {
		this.connect();
	}

	connect() {
		this.socket = new WebSocketManager();

		this.socket.addHandler('load', data => {
			this.setState({ subText: data.text });
			this.video.setState({ subText: data.text });
			this.video.setClip(data.text, data.file);

			this.setState({
				videoVisible: true,
				loaded: {
					season: data.season,
					episode: data.episode,
					sid: data.sid
				},
				mapId: data.map
			});

			this.setState({ load: data });
		});

		this.socket.addHandler('saved', data => {
			const { hostname, port } = window.location;
			document.location = `http://${hostname}:${port}/api/video/${
				data.file
			}/download`;
		});

		this.socket.addHandler('searchResult', data => {
			this.setState({ searchResults: data });
		});

		this.socket.addHandler('onClose', () => {
			this.connect();
		});

		window.onresize = this.video.setCanvasSize.bind(this.video);

		this.video.setTextColor(this.props.colors[0]);

		this.loadClip(
			this.state.load.season,
			this.state.load.episode,
			this.state.load.sid
		);
	}

	loadClip(season, episode, sid) {
		this.socket.send('load', { season, episode, sid });
	}

	loadRandom = e => {
		this.socket.send('random');
	};

	save = () => {
		this.socket.send('save', {
			season: this.state.loaded.season,
			episode: this.state.loaded.episode,
			sid: this.state.loaded.sid,
			text: this.video.state.subText,
			color: this.video.state.textColor
		});
	};

	onSearchSelect = value => {
		this.loadClip(value.season, value.episode, value.sid);
	};

	handleTextChange = e => {
		this.setState({ subText: e.target.value });
		this.video.setText(e.target.value);
	};

	doSearch = keywords => {
		this.socket.send('search', keywords);
	};

	render() {
		return (
			<div className="container">
				<div className="row">
					<div className="col-md-12">
						<h5>Search</h5>
						<Search
							// ref={e => (this.search = e)}
							onSelect={this.onSearchSelect}
							search={this.doSearch}
							searchResults={this.state.searchResults}
						/>
					</div>
				</div>
				<div className="row">
					<div className="col-md-3">
						{this.state.videoVisible ? (
							<div id="edit">
								<div className="buttons">
									<Button
										disabled={!this.state.buttonsEnabled}
										id="random"
										text="Random"
										onClick={this.loadRandom}
									/>
									<Button
										disabled={!this.state.buttonsEnabled}
										id="save"
										text="Download"
										onClick={this.save}
									/>
								</div>

								<Colors
									colors={this.props.colors}
									onClick={color =>
										this.video.setTextColor(color)
									}
								/>
								<textarea
									value={this.state.subText}
									ref={e => (this.editText = e)}
									onChange={this.handleTextChange}
								/>
							</div>
						) : null}
					</div>
					<div className="col-md-9">
						<Video
							ref={e => (this.video = e)}
							defaultWidth={this.props.defaultWidth}
							defaultHeight={this.props.defaultHeight}
							saveVideoObject={video => this.setState({ video })}
						/>

						{this.state.mapId ? (
							<ColorMap
								id={this.state.mapId}
								video={this.state.video}
							/>
						) : null}
					</div>
				</div>
				<div className="row">
					<div className="col-md-12" />
				</div>
			</div>
		);
	}
}

ReactDOM.render(
	<App
		colors={['#ffffff', '#ff0000', '#ffe60a']}
		defaultWidth="720"
		defaultHeight="404"
	/>,
	document.getElementById('root')
);
