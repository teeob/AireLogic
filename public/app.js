'use strict'

function process(query) {
    refresh();

    const artisteUrl = `http://musicbrainz.org/ws/2/artist/?query=artist:${query}&limit=1&fmt=json`; //return top artist

    fetch(artisteUrl)
    .then(r => r.json())
    .then(r => {
        /* first get all albums for artist */
        const limit = 100; const artist = r.artists[0].id;

        const albumUrl = `http://musicbrainz.org/ws/2/release-group/?query=release-group:%20*%20AND%20arid:${artist}%20AND%20status:official&limit=${limit}&fmt=json`;
        let releaseGroups = [];
        
        return fetchAllReleaseGroups(albumUrl, releaseGroups, limit, artist);
    })
    .then(releaseGroups => {
        /* then collate all releases of albums */
        let releases = []; let albums = []; 

        releaseGroups.forEach(releaseGroup => {
            
            if(releaseGroup['primary-type'] === "Album" && !(releaseGroup['secondary-types'] && releaseGroup['secondary-types'].length)){
                albums.push(releaseGroup.title);
            }

            releaseGroup.releases.forEach(release => {
                /* add to array to make quering musicbrainz for each individual release easier */
                release.album = releaseGroup.title;
                releases.push(release);
            })
        })

        return {releases, albums};
    })
    .then(values => {
        /* then get distinct record and calculate statistics */
        let recordings = new Map();
        let releases = values.releases;
        let albums = values.albums;

        const limit = releases.length;

        for(let i=0; i<= limit; i++){
            setTimeout(async () => {
                if(i === limit) {
                    recordings = await getLyricsOf(recordings);

                    let statistics = getStatistics(recordings, albums);

                    console.log(recordings);
                    console.log(statistics.albumsMap);

                    $("wired-spinner").hide();

                    $('#p1')[0].innerHTML = `${query} has ${recordings.size} songs & ${albums.length} albums.`
                    if(recordings.size > 0) {
                        $('#p2')[0].innerHTML = `the total amount of words discovered approximate to ${statistics.total}* words averaging roughly at ${statistics.average} words per song.`
                        $('#p3')[0].innerHTML = `"${statistics.maxAlbum}" album has the most amount of words with ${statistics.albumsMap.get(statistics.maxAlbum).val} words & "${statistics.maxSong}" is the song having most words with ${statistics.max} words.`
                        $('#p4')[0].innerHTML = `The bar chart shows how all ${query}'s songs vary in words per album.`
                    }

                    createTsv(statistics.albumsMap);
                }else {
                    getRecordings(recordings, releases[i]);
                }
            }, i*1000);
        }
    })
    .catch(e => console.error(`error message -> ${e} ${e}`))
}

/**
 * function to create tsv file
 * @param {Map} albums 
 */
function createTsv(albums) {
    let row = `letter	frequency\r\n`;

    for (let [k, v] of albums.entries()) {
        row += `${k}	${v.val}\r\n`
    }

    fetch('/save', {
        method: 'POST', 
        headers: {
            'Content-Type': 'text/tab-separated-values'
        },
        body: row
    })
    .catch(e => console.log(e))

    drawChart();
 }

/**
 * function to calculate statistics for the recordings(songs)
 * @param {Map} recordings 
 * @param {Array} albumsArr 
 */
function getStatistics(recordings, albumsArr) {
    let max=Number.MIN_VALUE, min=Number.MAX_VALUE, total=0; 
    let maxSong, minSong, maxAlbum = "";

    let albumsMap = new Map();

    for (let [record, artist] of recordings.entries()) {
        total += artist.count;

        if(artist.count > max){
            max = artist.count;
            maxSong = record;
        }

        if(artist.count < min){
            min = artist.count;
            minSong = record;
        }

        if(albumsArr.includes(artist.album)) {
            if(albumsMap.has(artist.album)){
                albumsMap.get(artist.album).val+=artist.count;
            }
            else{
                albumsMap.set(artist.album, {val: artist.count})
            }
        }
    }

    let x = 0;
    for (let [record, count] of albumsMap.entries()) {
        if(count.val > x) {
            x = count.val;
            maxAlbum = record;
        }
    }

    let average = Math.ceil(total/recordings.size);

    return {max, min, total, average, maxSong, minSong, albumsMap, maxAlbum};
}
/**
 * async function that gets lyrics of all recodings(songs)
 * @param {Map} recordings 
 */
async function getLyricsOf(recordings) {
    try {
         for (let [record, artist] of recordings.entries()) {

            record = record.replace(new RegExp('/', 'g'), '-');

            const recordUrl = `https://api.lyrics.ovh/v1/${artist.artist}/${record}`
            const res = await fetch(recordUrl);
            let r = await res.json();
            
            (r.lyrics && r.lyrics.length) ? artist.count = wordCount(r.lyrics) : artist.count = 0;
        }

        return recordings;
    }
    catch (e) {
        console.error(`error fetching lyrics || error message -> ${e}`)
    }
}

const wordCount = (str) => { 
    return str.match(/\S+/g).length;
}

/**
 * async function that gets all release groups(equivalent to albums) and have all releases for that album 
 * @param {string} url 
 * @param {Array} releaseGroups 
 * @param {int} count 
 * @param {int} artist 
 */
async function fetchAllReleaseGroups(url, releaseGroups, count, artist) {
    try {
        const res = await fetch(url);
        let r = await res.json();

        releaseGroups = releaseGroups.concat(r['release-groups']);

        if(r.count > count) {
            const albumUrl = `http://musicbrainz.org/ws/2/release-group/?query=release-group:%20*%20AND%20arid:${artist}%20AND%20status:official&limit=100&offset=${count}&fmt=json`
            count+=100

            return fetchAllReleaseGroups(albumUrl, releaseGroups, count, artist)
        }

        return releaseGroups;
    }
    catch (e) {
        console.error(`error fetching from ${url} || error mesage -> ${e}`)
    }
}

/**
 * async function that gets all recordings/songs in each release of an album(or release group)
 * @param {Map} recordings 
 * @param {Array} release 
 */
async function getRecordings(recordings, release) {
    try {
        const recordingUrl = `http://musicbrainz.org/ws/2/recording/?query=reid:${release.id}&limit=100&fmt=json`

        const res = await fetch(recordingUrl);
        let r = await res.json();

        r.recordings.forEach(recording => {
            //console.log(recording)
            /* add owner of record, in case artist has been featured - useful when searching for lyrics */
            recordings.set(recording.title.toLowerCase(), {artist: recording['artist-credit'][0].name, album: release.album}); 
        })
    }
    catch (e) {
        console.error(`failed to get recordings for ${release.title} || error mesage -> ${e}`)
    }
}

function refresh() {
    $("wired-spinner").show();

    $('#p1')[0].innerHTML = ''
    $('#p2')[0].innerHTML = ''
    $('#p3')[0].innerHTML = ''
    $('#p4')[0].innerHTML = ''

    var canvas = $('#canvas')[0];
    canvas.width = canvas.width;
}

document.addEventListener('DOMContentLoaded', () => {
    $("wired-button").click((e) => {
        e.preventDefault();

        let query = $("wired-input").val();
        
        process(query);
    });
})