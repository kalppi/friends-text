import React from 'react';
import ReactDOM from 'react-dom';
import './style.css';
import WebSocketManager from './websocketmanager';
import Video from './video';
import Search from './search';

let port = window.location.port;

if (process.env.NODE_ENV === 'development') {
	port = 8080;
}

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
	constructor(props) {
		super(props);

		this.state = {
			videoVisible: false,
			loaded: {},
			load: {
				season: 1,
				episode: 1,
				sid: 265
			},
			subText: '',
			buttonsEnabled: true
		};
	}

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
				}
			});

			this.setState({ load: data });

			this.enableButtons();
		});

		this.socket.addHandler('saved', data => {
			document.location =
				'http://' +
				window.location.hostname +
				':' +
				port +
				'/video/' +
				data.file +
				'/download';
		});

		this.socket.addHandler('searchResult', data => {
			this.search.setSearchResults(data);
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

	handleTextChange(e) {
		this.setState({ subText: e.target.value });
		this.video.setText(e.target.value);
	}

	doSearch(keywords) {
		this.socket.send('search', keywords);
	}

	disableButtons() {
		this.setState({ buttonsEnabled: false });
	}

	enableButtons() {
		this.setState({ buttonsEnabled: true });
	}

	loadClip(season, episode, sid) {
		this.socket.send('load', { season, episode, sid });

		this.disableButtons();
	}

	loadRandom(e) {
		this.socket.send('random');

		this.disableButtons();
	}

	save() {
		this.socket.send('save', {
			season: this.state.loaded.season,
			episode: this.state.loaded.episode,
			sid: this.state.loaded.sid,
			text: this.video.state.subText,
			color: this.video.state.textColor
		});
	}

	onSearchSelect(e) {
		this.loadClip(
			e.params.data.season,
			e.params.data.episode,
			e.params.data.sid
		);
	}

	render() {
		return (
			<div className="container">
				<div className="row">
					<div className="col-md-12">
						<h5>Search</h5>
						<Search
							ref={e => (this.search = e)}
							onSelect={this.onSearchSelect.bind(this)}
							search={this.doSearch.bind(this)}
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
										onClick={this.loadRandom.bind(this)}
									/>
									<Button
										disabled={!this.state.buttonsEnabled}
										id="save"
										text="Download"
										onClick={this.save.bind(this)}
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
									onChange={this.handleTextChange.bind(this)}
								/>
							</div>
						) : null}
					</div>
					<div className="col-md-9">
						<Video
							ref={e => (this.video = e)}
							defaultWidth={this.props.defaultWidth}
							defaultHeight={this.props.defaultHeight}
						/>
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
