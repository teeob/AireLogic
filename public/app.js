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
    let artisteUrl = `http://musicbrainz.org/ws/2/artist/?query=artist:${query}&limit=1&fmt=json`; //return top artist

    fetch(artisteUrl)
        .then(r => r.json())
        .then((r) => {
            let limit = 100

            let albumUrl = `http://musicbrainz.org/ws/2/release-group/?query=release-group:%20*%20AND%20arid:${r.artists[0].id}%20AND%20status:official&limit=${limit}&fmt=json`;
            let releasGroups = [];
            
           return keepFetching(albumUrl, releasGroups, limit, r.artists[0].id)
        })
        .then(releaseGroups => {
            let recordings = new Set(); let releases = [];
    
            releaseGroups.forEach(releaseGroup => {
                releaseGroup.releases.forEach(release => {
                    releases.push(release); //to make quering musicbrainz for each individual release easier
                })
            })

            releases.forEach(delayLoop(release => {
                getRecordings(recordings, release);
            }, 1000))
        })
        .catch(e => console.error(`error finding artist ${e}`))
        //finally
}

function keepFetching(url, releaseGroups, count, artist){
    return fetch(url)
    .then(r => r.json())
    .then(r => {
        releaseGroups = releaseGroups.concat(r['release-groups']);

        if(r.count > count) {
            
            let albumUrl = `http://musicbrainz.org/ws/2/release-group/?query=release-group:%20*%20AND%20arid:${artist}%20AND%20status:official&limit=100&offset=${count}&fmt=json`
            count+=100

            return keepFetching(albumUrl, releaseGroups, count, artist)
        }
        return releaseGroups;
    })
    .catch(e => console.error(`error fetching from ${url} || error mesage -> ${e}`))
}

function getRecordings(recordings, release){
    let recordingUrl = `http://musicbrainz.org/ws/2/recording/?query=reid:${release.id}&limit=100&fmt=json`

    fetch(recordingUrl)
    .then(r => r.json())
    .then(r => {
        r.recordings.forEach(recording =>{
            recordings.add(recording.title);
        })
    })
    .catch(e => console.error(`error finding record ${e}`))
    //finally

    console.log(recordings);
    return recordings;
}

function delayLoop(fn, delay){
    return (x, i) => {
        setTimeout(() => {
        fn(x);
        }, i * delay);
    };
};