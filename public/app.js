'use strict'

function process(query) {
    refresh();

    const artisteUrl = `http://musicbrainz.org/ws/2/artist/?query=artist:${query}&limit=1&fmt=json`; //return top artist

    fetch(artisteUrl)
    .then(r => r.json())
    .then(r => {
        /* first get all albums for artist */
        const limit = 100; const artist = r.artists[0].id

        const albumUrl = `http://musicbrainz.org/ws/2/release-group/?query=release-group:%20*%20AND%20arid:${artist}%20AND%20status:official&limit=${limit}&fmt=json`;
        let releaseGroups = [];
        
        return fetchAllReleaseGroups(albumUrl, releaseGroups, limit, artist);
    })
    .then(releaseGroups => {
        /* then collate all releases of albums */
        const releases = []; 

        releaseGroups.forEach(releaseGroup => {
            releaseGroup.releases.forEach(release => {
                /* add to array to make quering musicbrainz for each individual release easier */
                release.album = releaseGroup.title;
                releases.push(release);
            })
        })

        return releases;
    })
    .then(releases => {
        /* then get distinct record and calculate statistics */
        let recordings = new Map();
        const limit = releases.length;

        for(let i=0; i<= limit; i++){
            setTimeout(async () => {
                if(i == limit) {
                    recordings = await getLyricsOf(recordings);

                    console.log(recordings);

                    let statistics = getStatistics(recordings);

                    $("wired-spinner").hide();

                    $('#p1')[0].innerHTML = `${query} has ${recordings.size} songs.`
                    if(recordings.size > 0) {
                        $('#p2')[0].innerHTML = `the total amount of words discovered approximate to <b>${statistics.total}</b> averaging roughly at ${Math.ceil(statistics.average)} words per song.`
                        $('#p3')[0].innerHTML = `"${statistics.maxSong}" has the most amount of words with ${statistics.max} words & "${statistics.minSong}" has the least with ${statistics.min} words.`
                    }
                }else {
                    getRecordings(recordings, releases[i]);
                }
            }, i*1000);
        }
    })
    .catch(e => console.error(`error finding artist ${e}`))
}

/** 
 * function to calculate statistics for the recordings(songs)
*/
function getStatistics(recordings) {
    let max=Number.MIN_VALUE, min=Number.MAX_VALUE, total=0; 
    let maxSong, minSong = "";

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
    }

    let average = total/recordings.size;

    return {
        'max': max,
        'min': min,
        'total': total,
        'average': average,
        'maxSong': maxSong,
        'minSong': minSong
    };
}

/** 
 * async function that gets lyrics of all recodings(songs)
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
 * function that gets all recordings/songs in each release of an album(or release group)
*/
async function getRecordings(recordings, release) {
    try {
        const recordingUrl = `http://musicbrainz.org/ws/2/recording/?query=reid:${release.id}&limit=100&fmt=json`

        const res = await fetch(recordingUrl);
        let r = await res.json();

        r.recordings.forEach(recording => {
            /* add owner of record, in case artist has been featured - useful when searching for lyrics */
            recordings.set(recording.title.toLowerCase(), {artist: recording['artist-credit'][0].name, album: release.album}); 
        })
    }
    catch (e) {
        console.error(`failed to get recordings for ${release.title} || error mesage -> ${e}`)
    }
    console.log('3')
}

function refresh() {
    $("wired-spinner").show();

    $('#p1')[0].innerHTML = ''
    $('#p2')[0].innerHTML = ''
    $('#p3')[0].innerHTML = ''
}

document.addEventListener('DOMContentLoaded', () => {
    $("wired-button").click((e) => {
        e.preventDefault();

        let query = $("wired-input").val();
        
        process(query);
    });
})