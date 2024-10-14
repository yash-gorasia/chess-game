const express = require('express');
const http = require('http');
const Socket = require('socket.io');
const path = require('path');


const app = express();

// Set EJS as templating engine
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    res.render('home');  // 'home' refers to 'home.ejs' in the views folder
});


const server = http.createServer(app);

const io = Socket(server);


io.on("connection", (socket) => {

    socket.emit("message", "hello welcome");

    socket.on("message", (message) => {
        console.log("message : ", message);
        io.emit("message", message)
        
    })
})

server.listen(8000, () => {
    console.log("Server is running on port 8000");
});