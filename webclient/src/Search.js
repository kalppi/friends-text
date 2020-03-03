import React from 'react';
import Select from 'react-select';
import memoize from 'memoize-one';

import './css/search.css';

class Search extends React.Component {
	state = {
		options: [],
		searchTerms: ''
	};

	handleInputChange = (value, { action }) => {
		if (action !== 'set-value') {
			this.setState({ searchTerms: value }, this.doSearch);

			return value;
		}

		return this.state.searchTerms;
	};

	handleChange = value => {
		this.props.onSelect(value);
	};

	doSearch() {
		clearTimeout(this.searchTimer);

		this.searchTimer = setTimeout(async () => {
			const { searchTerms } = this.state;

			if (searchTerms.length > 0) {
				this.props.search(searchTerms);
			}
		}, 300);
	}

	parseResults = memoize(results => {
		const data = {
			results: []
		};

		const grouped = {};

		for (let r of results) {
			const key = r.season.toString() + 'x' + r.episode.toString();

			if (!grouped[key]) {
				grouped[key] = [];
			}

			grouped[key].push({
				value: r.season + 'x' + r.episode + '/' + r.sid,
				season: r.season,
				episode: r.episode,
				sid: r.sid,
				label: r.text
			});
		}

		const keys = Object.keys(grouped);

		for (let k of keys) {
			const group = {
				value: k,
				label: k,
				options: []
			};

			for (let i in grouped[k]) {
				const r = grouped[k][i];

				group.options.push(r);
			}

			data.results.push(group);
		}

		return data.results;
	});

	render() {
		return (
			<Select
				id="search"
				options={this.parseResults(this.props.searchResults)}
				inputValue={this.state.searchTerms}
				onInputChange={this.handleInputChange}
				onChange={this.handleChange}
				filterOption={v => true}
			/>
		);
	}
}

export default Search;
