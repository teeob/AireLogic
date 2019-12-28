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
        
        processQuery(query);
    })
})

function processQuery(query) {
    const artisteUrl = `http://musicbrainz.org/ws/2/artist/?query=artist:${query}&limit=1&fmt=json`; //return top artist

    fetch(artisteUrl)
    .then(r => r.json())
    .then((r) => {
        let limit = 100; let artist = r.artists[0].id

        const albumUrl = `http://musicbrainz.org/ws/2/release-group/?query=release-group:%20*%20AND%20arid:${artist}%20AND%20status:official&limit=${limit}&fmt=json`;
        let releasGroups = [];
        
        return keepFetching(albumUrl, releasGroups, limit, artist);
    })
    .then(releaseGroups => {
        let recordings = new Map(); let releases = [];

        releaseGroups.forEach(releaseGroup => {
            releaseGroup.releases.forEach(release => {
                //add to array to make quering musicbrainz for each individual release easier
                releases.push(release);
            })
        })

        releases.forEach(delayLoop(release => {
            getRecordings(recordings, release);
        }, 1000))
    })
    .catch(e => console.error(`error finding artist ${e}`))
        //finally
}

async function keepFetching(url, releaseGroups, count, artist){

    try {
        let res = await fetch(url);
        let r = await res.json();

        releaseGroups = releaseGroups.concat(r['release-groups']);

        if(r.count > count) {
            const albumUrl = `http://musicbrainz.org/ws/2/release-group/?query=release-group:%20*%20AND%20arid:${artist}%20AND%20status:official&limit=100&offset=${count}&fmt=json`
            count+=100

            return keepFetching(albumUrl, releaseGroups, count, artist)
        }

        return releaseGroups;
    }
    catch (e) {
        console.error(`error fetching from ${url} || error mesage -> ${e}`)
    }

}

async function getRecordings(recordings, release){
    const recordingUrl = `http://musicbrainz.org/ws/2/recording/?query=reid:${release.id}&limit=100&fmt=json`

    try {
        let res = await fetch(recordingUrl);
        let r = await res.json();

        r.recordings.forEach(recording =>{
            //add owner of record, in case artist has been featured - useful when searching for lyrics
            recordings.set(recording.title, recording['artist-credit'][0].name); 
        })

        console.log(recordings)
        return recordings;
    }
    catch (e) {
        console.error(`failed to get recordings for ${release.title} || error mesage -> ${e}`)
    }
}

function delayLoop(fn, delay){
    return (x, i) => {
        setTimeout(() => {
        fn(x);
        }, i * delay);
    };
};