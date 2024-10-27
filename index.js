const express = require('express');
const http = require('http');
const Socket = require('socket.io');
const path = require('path');
const { Chess } = require('chess.js');

const app = express();

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Route to join the room
app.get('/', (req, res) => {
    res.render('room');
});


app.get('/home', (req, res) => {
    const roomId = req.query.roomId;
    if (!roomId) {
        return res.redirect('/');
    }
    res.render('home', { roomId });
});

const server = http.createServer(app);
const io = Socket(server);

const games = {}; // Object to hold each room's game state

// 1. socket.on('connection') -> when a user connects to the server, this event is triggered.
// 2. socket.on('joinRoom') -> when a user joins a room, this event is triggered.
// 3. socket.emit('playerRole') -> emit the player role to the user.
// 4. socket.emit('boardState') -> emit the initial board state to the user.
// 5. socket.on('move') -> when a user makes a move, this event is triggered.
// 6. socket.on('disconnect') -> when a user disconnects from the server, this event is triggered.
// 7. io.to(roomId).emit() -> emit events to all users in a specific room.
// 8. socket.on('capture') -> when a piece is captured, this event is triggered.
io.on("connection", (socket) => {
    console.log("User connected.");

    // Join a specific room
    socket.on('joinRoom', (roomId) => {
        console.log(`User joined room ${roomId}`);

        socket.join(roomId);

        // Create a new game if the room does not exist
        if (!games[roomId]) {
            games[roomId] = {
                chess: new Chess(),
                players: {},
                currentPlayer: 'w'
            };
        }

        const game = games[roomId];

        // Assign roles to the player
        if (!game.players.white) {
            game.players.white = socket.id;
            socket.emit("playerRole", "w");
        } else if (!game.players.black) {
            game.players.black = socket.id;
            socket.emit("playerRole", "b");
        } else {
            socket.emit("spectatorRole");
        }

        // Emit initial board state
        socket.emit("boardState", game.chess.fen());

        // Handle player move
        // chess.fen() -> FEN is a standard notation for describing a particular board position of a chess game. The purpose of FEN is to provide all the necessary information to restart a game from a particular position.
        // chess.move() -> validate if the move is valid or not
        // chess.turn() -> return the current player turn
        socket.on("move", (move) => {
            const chess = game.chess;

            try {
                // Ensure that the correct player makes the move
                if (chess.turn() === 'w' && socket.id !== game.players.white) return;
                if (chess.turn() === 'b' && socket.id !== game.players.black) return;

                const result = chess.move(move);
                if (result) {
                    game.currentPlayer = chess.turn();
                    io.to(roomId).emit("move", move);
                    io.to(roomId).emit("boardState", chess.fen());
                } else {
                    socket.emit("invalidMove", move);
                }
            } catch (err) {
                console.log(err);
                socket.emit("invalidMove", move);
            }
        });

        // Handle piece capture
        socket.on('capture', (data) => {
            io.to(roomId).emit('capture', data);
        });

        // Handle player disconnection
        socket.on("disconnect", () => {
            if (socket.id === game.players.white) {
                delete game.players.white;
            } else if (socket.id === game.players.black) {
                delete game.players.black;
            }
        });
    });
});

server.listen(8000, () => {
    console.log("Server is running on port 8000");
});
