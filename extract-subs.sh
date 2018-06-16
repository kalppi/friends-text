rm -r data/subs

mkdir data/subs

for file in data/*.mkv; do
	out=${file##*/}
	out="data/subs/${out%.*}.srt"

	ffmpeg -i "$file" -map 0:s:0 "$out" -y
done