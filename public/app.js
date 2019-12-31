'use strict'
/*
$("wired-button").click(() => {
    var query = $("wired-input").val();
    
    console.log(query);
});
*/

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('submit').addEventListener('click', (e) => {
        e.preventDefault();

        let query = document.getElementById('query').value;
        
        process(query);
    })
})

function process(query) {
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
         let releases = []; 

        releaseGroups.forEach(releaseGroup => {
            releaseGroup.releases.forEach(release => {
                /* add to array to make quering musicbrainz for each individual release easier */
                releases.push(release);
            })
        })

        return releases;
    })
    .then(releases => {
        let recordings = new Map();
        let limit = releases.length;

        for(let i=0; i<= limit; i++){
            setTimeout(() => {
                if(i == limit) {
                    getLyricsOf(recordings);

                    console.log(recordings)
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
         for (let [recording, artist] of recordings.entries()) {
            //console.log(recording, artist);
        // let artist = 'Bon Iver'
        // let recording = 'Fall Creek Boys Choir'

        console.log(recording);
        recording = recording.replace(new RegExp('/', 'g'), '-');
            console.log(recording);

            const recordUrl = `https://api.lyrics.ovh/v1/${artist}/${recording}`
            const res = await fetch(recordUrl);
            let r = await res.json();
            
            console.log(r);
        }
    }
    catch (e) {
        console.error(`error fetching lyrics || error message -> ${e}`)
    }
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
            recordings.set(recording.title, recording['artist-credit'][0].name); 
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