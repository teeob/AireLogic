'use strict'
document.addEventListener('DOMContentLoaded', () => {
    $("wired-button").click((e) => {
        e.preventDefault();

        let query = $("wired-input").val();
        
        //console.log(query);
        process(query);
    });
})

// document.addEventListener('DOMContentLoaded', () => {
//     document.getElementById('submit').addEventListener('click', (e) => {
//         e.preventDefault();

//         let query = document.getElementById('query').value;
        
//         process(query);
//     })
// })

function process(query) {
    $("wired-spinner").show();

    const artisteUrl = `http://musicbrainz.org/ws/2/artist/?query=artist:${query}&limit=1&fmt=json`; //return top artist

    fetch(artisteUrl)
    .then(r => r.json())
    .then(r => {
        const limit = 100; const artist = r.artists[0].id

        const albumUrl = `http://musicbrainz.org/ws/2/release-group/?query=release-group:%20*%20AND%20arid:${artist}%20AND%20status:official&limit=${limit}&fmt=json`;
        let releaseGroups = [];
        
        return fetchAllReleaseGroups(albumUrl, releaseGroups, limit, artist);
    })
    .then(releaseGroups => {
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
        let recordings = new Map();
        const limit = releases.length;

        for(let i=0; i<= limit; i++){
            setTimeout(() => {
                if(i == limit) {
                    getLyricsOf(recordings);

                    console.log(recordings);

                    $("wired-spinner").hide();

                   // document.getElementById("artist").innerHTML = query
                    $('#p1')[0].innerHTML = `${query} has ${recordings.size} songs`
                    $('#p2')[0].innerHTML = `the total amount of words discovered approximate to x and average at x words`
                    $('#p3')[0].innerHTML = `x song has the most amount of words & x song has the least amount of words`
                }else {
                    getRecordings(recordings, releases[i]);
                }
            }, i*1000);
        }
    })
    .catch(e => console.error(`error finding artist ${e}`))
}

async function getLyricsOf(recordings) {
    try {
        //console.log(recordings);
         for (let [record, artist] of recordings.entries()) {
            //console.log(recording, artist);
        // let artist = 'Bon Iver'
        // let recording = 'Fall Creek Boys Choir'

        record = record.replace(new RegExp('/', 'g'), '-');

            const recordUrl = `https://api.lyrics.ovh/v1/${artist.artist}/${record}`
            const res = await fetch(recordUrl);
            let r = await res.json();
            
            if(r.lyrics && r.lyrics.length)
                artist.count = wordCount(r.lyrics);
        }
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

        //console.log(recordings)
        // return recordings;
    }
    catch (e) {
        console.error(`failed to get recordings for ${release.title} || error mesage -> ${e}`)
    }
    console.log('3')
}

function delayLoop(fn, delay) {
    return (x, i) => {
        setTimeout(() => {
        fn(x);
        }, i * delay);
    };
};