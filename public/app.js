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
        let limit = 100; let artist = r.artists[0].id

        const albumUrl = `http://musicbrainz.org/ws/2/release-group/?query=release-group:%20*%20AND%20arid:${artist}%20AND%20status:official&limit=${limit}&fmt=json`;
        let releaseGroups = [];
        
        return fetchAllReleaseGroups(albumUrl, releaseGroups, limit, artist);
    })
    .then(releaseGroups => {
        let recordings = new Map(); let releases = []; let jh = new Map();

        releaseGroups.forEach(releaseGroup => {
            releaseGroup.releases.forEach(release => {
                /* add to array to make quering musicbrainz for each individual release easier */
                releases.push(release);
            })
        })

        // releases.forEach(delayLoop(release => {
        //     getRecordings(recordings, release);
        // }, 1000))
        // releases.forEach((release, i) => {
        //     setTimeout(() => {
        //         getRecordings(recordings, release);
        //         console.log('2')
        //     }, i * 1000);
        //     console.log('1')
        // })

        for(let x=0; x<= releases.length; x++){
            setTimeout(function(){
                if(x == releases.length) {
                    
                    jh = recordings
                    console.log(jh)
                    //return jh;
                }else {
                getRecordings(recordings, releases[x]);
                }
            }, x*1000);
        }
       // if(jh)
    })
    .then(r=> {
        console.log('test')
        console.log(r)
    })
    .catch(e => console.error(`error finding artist ${e}`))
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

        let res = await fetch(recordingUrl);
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