import React from 'react'
import ReactDOM from 'react-dom'
import './style.css'
import WebSocketManager from './websocketmanager'
import Video from './video'
import Search from './search'

let port = window.location.port;

if(process.env.NODE_ENV === 'development') {
	port = 8080;
}

const Colors = ({colors, onClick}) => {
	return <div id="color">
		{colors.map((color, index) => {
			return <div key={index} style={{background: color}} onClick={() => {
				onClick(color);
			}}></div>
		})}
		</div>
}

const Button = ({id, text, onClick}) => {
	return <button id={id} className="btn btn-primary" onClick={onClick}>{text}</button>
}

class App extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			videoVisible: false,
			loaded: {},
			load: {
				season: 1,
				episode: 1,
				sid: 253
			}
		};
	}

	componentDidMount() {
		this.connect();
	}

	connect() {
		this.socket = new WebSocketManager();

		this.socket.addHandler('load', (data) => {
			this.video.setState({subText: data.text});
			this.video.setClip(data.text, data.file);
			this.setState({
				videoVisible: true,
				loaded: {season: data.season, episode: data.episode, sid: data.sid}
			});

			this.setState({load: data});
		});

		this.socket.addHandler('saved', (data) => {
			document.location = 'http://' + window.location.hostname + ':' + port + '/video/' + data.file + '/download';
		});

		this.socket.addHandler('searchResult', (data) => {
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
		this.video.setText(e.target.value);
	}

	doSearch(keywords) {
		this.socket.send('search', keywords);
	}

	loadClip(season, episode, sid) {
		this.socket.send('load',  {season, episode, sid});
	}

	loadRandom(e) {
		this.socket.send('random');
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
		this.loadClip(e.params.data.season, e.params.data.episode, e.params.data.sid);
	}

	render() {
		return <div className="container">
			<div className="row">
				<div className="col-md-12">
					<Search ref={e => this.search = e} onSelect={this.onSearchSelect.bind(this)} search={this.doSearch.bind(this)} />
				</div>
			</div>
			<div className="row">
				<div className="col-md-3">
				{(() => {
					if(this.state.videoVisible) {
						return <div id="edit">
							<div className='buttons'>
								<Button id="random" text="Random" onClick={this.loadRandom.bind(this)} />
								<Button id="save" text="Download" onClick={this.save.bind(this)} />
							</div>
						
							<Colors colors={this.props.colors} onClick={color => this.video.setTextColor(color)} />
							<input type="text" ref={e => this.editText = e} onChange={this.handleTextChange.bind(this)} />
						</div>
					}
					})()
				}
				</div>
				<div className="col-md-9">
					<Video ref={e => this.video = e} defaultWidth={this.props.defaultWidth} defaultHeight={this.props.defaultHeight} />
				</div>
			</div>
			<div className="row">
				<div className="col-md-12">
					
				</div>
			</div>
		</div>
	}
}

ReactDOM.render(
	<App colors={['#ffffff', '#ff0000', '#ffe60a']} defaultWidth="720" defaultHeight="404" />,
	document.getElementById('root')
)
