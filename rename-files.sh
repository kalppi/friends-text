for file in data/*.mkv; do
	base=${file##*/}

	if [[ $base =~ ^Friends.s([0-9]+).e?([0-9]+) ]]; then
		mv "$file" "data/Friends.s${BASH_REMATCH[1]}.e${BASH_REMATCH[2]}.mkv" 2>/dev/null;
	fi
done