const express = require('express');
const app = express();

const port = process.env.PORT || 2020

app.use(express.static('/public'))

app.get('/', (req, res) => {
    res.send('Cannot find index.html file :)')
})

app.listen(port, () => {console.log(`live on ${port}`)});