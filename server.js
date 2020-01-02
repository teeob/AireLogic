const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');

const port = process.env.PORT || 2020

app.use(express.static('public'))

app.get('/', (req, res) => {
    res.send('Cannot find index.html file :)')
})

app.use(bodyParser.text({ type: 'text/tab-separated-values' }));
app.post('/save', function(req, res) {
    let dir = './public/data.tsv';
    let toSave = req.body;
    
    console.log(toSave)

    fs.writeFile(dir, toSave, e => {
        if (e) console.log(e);
        //console.log(`file saved to ${dir}`);
    });
})

app.listen(port, () => {console.log(`live on ${port}`)});