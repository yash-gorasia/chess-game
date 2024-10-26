const express = require('express');
const http = require('http');
const Socket = require('socket.io');
const path = require('path');
const { Chess } = require('chess.js');
const { title } = require('process');



const app = express();


app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    res.render('home', { title: "Chess Game." });
});


const server = http.createServer(app);

const io = Socket(server);

const chess = new Chess();

let players = {}

let currentPlayer = 'w'


io.on("connection", (socket) => {
    console.log("user connected.");

    // 1. if the player is not white then assign him white
    // 2. if the player is not black then assign him black
    // 3. if both roles are already assigned then , assign him spectator role
    if (!players.white) {
        players.white = socket.id;
        socket.emit("playerRole", "w");
    }
    else if (!players.black) {
        players.black = socket.id
        socket.emit("playerRole", "b");
    }
    else {
        socket.emit("spectatorRole");
    }


    // dissconect the socket
    socket.on("disconnect", () => {
        if (socket.id === players.white) {
            delete players.white;
        }
        else if (socket.id === players.black) {
            delete players.black;
        }
    })

    socket.on("move", (move) => {
        // chess.turn() ->  a function that returns the side that is currently able to move. 
        // chess.move() -> will determine the valid move.
        // chess.fen() ->  a standard notation for describing a particular board position of a chess game.
        try {
            // 1. if it is turn of white and black is trying to move then return
            // 2. if it is turn of black and white is trying to move then return
            if (chess.turn() === 'w' && socket.id !== players.white) return;
            else if (chess.turn() === 'b' && socket.id !== players.black) return;

            // this line of code will check if the move is valid or not.
            const result = chess.move(move);

            // 1.we are checking whose turn is it. and then assigning it to the currentPlayer
            // 2. emit the move event to frontend.
            // 3. emit the current state of the board , after the move has been made.
            // 4. if the move is invalid then send msg to the user.
            if (result) {
                currentPlayer = chess.turn();
                io.emit("move", move);
                io.emit("boardState", chess.fen());
            }
            else {
                console.log("Invalid move.", move);
                socket.emit("invalidMove", move);
            }
        }
        catch (err) {
            console.log(err);
            socket.emit("invalidMove", move);
        }
    })

    socket.on('capture', (data) => {
        // Broadcast the captured piece to all connected clients
        io.emit('capture', data);
    });
})

server.listen(8000, () => {
    console.log("Server is running on port 8000");
});