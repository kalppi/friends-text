import React from 'react'
import './css/search.css'

let searchTimer = null;

const parseResults = results => {
	const data = {
        results: []
    };

    const grouped = {};

	for(let r of results) {
		const key = r.season.toString() + 'x' + r.episode.toString();

		if(!grouped[key]) {
			grouped[key] = [];
		}

		grouped[key].push({
			id: r.season + 'x' + r.episode + '/' + r.sid,
			season: r.season,
			episode: r.episode,
			sid: r.sid,
			text: r.text
		});
	}

	const keys = Object.keys(grouped);

	for(let k of keys) {
		const group = {
			id: k,
			text: k,
			children: []
		};

		for(let i in grouped[k]) {
			const r = grouped[k][i];

			group.children.push(r);
		}

		data.results.push(group);
	}

	return data;
}

class Search extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			searchResults: null
		};
	}

	shouldComponentUpdate() {
		return false
	}

	query(query) {
		if(query.term && query.term !== '') {
			clearTimeout(searchTimer);

			searchTimer = setTimeout(async () => {
				this.props.search(query.term);

				await this.searchResultsReady();
				
				const results = parseResults(this.state.searchResults);

				query.callback(results);

			}, 300);
		} else {
			return false;
		}
	}

	searchResultsReady() {
		return new Promise((resolve, reject) => {
			this.searchResultsReadyResolve = resolve;
		});
	}

	setSearchResults(results) {
		this.setState({searchResults: results}, () => {
			if(this.searchResultsReadyResolve) {
				this.searchResultsReadyResolve();
				this.searchResultsReadyResolve = null;
			}
		});
	}

	componentDidMount() {
		this.$select = window.$(this.select);

		this.$select.select2({
			query: this.query.bind(this)
		});

		this.$select.on('select2:select', this.props.onSelect);
	}

	render() {
		return <select id="search" ref={e => this.select = e}></select>
	}
}

export default Search;