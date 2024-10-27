const socket = io();
const chess = new Chess()
const boardElement = document.querySelector('.chessboard');

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
const capturedPieces = { white: [], black: [] }; // Store captured pieces

// serve mathi mde che
const roomId = "<%= roomId %>"; 

if (roomId) {
    socket.emit('joinRoom', roomId); // Join the room with the roomId
} else {
    alert('Room ID missing. Please enter a valid Room ID.');
    window.location.href = '/';
}



// 1. store the dimension of board using [ board() function ]
// 2. in some case if  there is some element in board , remove it.
// 3. traverse through each square of each row.
// 4. create a div element for each square.
// 5. add class to each square element.
// 6. add dataset to each square element.
// 7. if square color is w then assign it white else balck (here color will provided by board())
// 8. if the assigned color and the color of currentplayer is equal then allow him to drag piece
// 9. if the piece is draggable then assign it to draggedpiece and also mention the source from which the piece is moved.
const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = '';
    board.forEach((row, rowindex) => {
        row.forEach((square, squareindex) => {
            const squareElem = document.createElement("div");
            squareElem.classList.add("square",
                (rowindex + squareindex) % 2 == 0 ? "light" : "dark"
            )

            squareElem.dataset.row = rowindex;
            squareElem.dataset.col = squareindex;

            if (square) {
                const pieceElem = document.createElement("div");
                pieceElem.classList.add("piece",
                    square.color === "w" ? "white" : "black"
                )
                pieceElem.innerText = getPieceUniCode(square);
                pieceElem.draggable = playerRole === square.color;

                pieceElem.addEventListener("dragstart", (e) => {
                    if (pieceElem.draggable) {
                        draggedPiece = pieceElem
                        sourceSquare = { row: rowindex, col: squareindex }
                        // this will ensure that the drag operation is being done smoothly.
                        e.dataTransfer.setData("text/plain", "");
                    }
                })

                pieceElem.addEventListener("dragend", () => {
                    draggedPiece = null
                    sourceSquare = null
                })

                squareElem.append(pieceElem)
            }

            // if the user is dragging the square elem whithout any reason then prevent it
            squareElem.addEventListener("dragover", (e) => {
                e.preventDefault();
            })

            squareElem.addEventListener("drop", (e) => {
                e.preventDefault();

                // when we are storing in dataset, it will be stored in the 'string' format -> hence we are using parseInt
                if (draggedPiece) {
                    const targetSource = {
                        row: parseInt(squareElem.dataset.row),
                        col: parseInt(squareElem.dataset.col)
                    }
                    handleMove(sourceSquare, targetSource)
                }
            })
            boardElement.append(squareElem);
        })
    })

    // IMP 
    // if the turn is of black piece then flip the board, else whole game will crash
    if (playerRole === 'b') {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("remove");
    }
};

// here we are using concept of ascii value
// in chess col are defined as a,b,c,...
// and rows rows are defined as 1 to 8
// lets say it is first box so 8th row and ath col
// so 97 + 0 and 8 - 8
// Function to handle moves and track captures
const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q', // Promotion to queen for example
    };

    const result = chess.move(move);

    // Check piece color and add to the respective array
    if (result && result.captured) {
        const color = result.color === 'w' ? 'black' : 'white';
        // capturedPieces[color].push(result.captured);

        // Emit the updated captured pieces to the server
        // this will help in maintain the state of all the captured piece
        socket.emit("capture", {
            color: color,
            piece: result.captured,
        });

        defeatedPieces();
    }
    // Emit move to socket
    socket.emit("move", move);
};

// Render captured pieces in the UI
// Render captured pieces in the UI
const defeatedPieces = () => {
    const leftContainer = document.querySelector('.lostpiece_left');
    const rightContainer = document.querySelector('.lostpiece_right');

    leftContainer.innerHTML = ''; // Clear previous content
    rightContainer.innerHTML = '';

    // Show all defeated white pieces on the left side
    capturedPieces.white.forEach(piece => {
        const pieceElem = document.createElement("div");
        pieceElem.classList.add("piece", "captured", "white");
        pieceElem.innerText = getPieceUniCode({ type: piece.toLowerCase() });
        if (playerRole === 'w') {
            leftContainer.append(pieceElem); // Always on the left side
        } else {
            rightContainer.append(pieceElem); // Always on the right side
        }
    });

    // Show all defeated black pieces on the right side
    capturedPieces.black.forEach(piece => {
        const pieceElem = document.createElement("div");
        pieceElem.classList.add("piece", "captured", "black");
        pieceElem.innerText = getPieceUniCode({ type: piece.toLowerCase() });
        if (playerRole === 'b') {
            leftContainer.append(pieceElem); // Always on the right side
        } else {
            rightContainer.append(pieceElem); // Always on the left side
        }
    });
};


// Call defeatedPieces to initialize display
defeatedPieces();




// got symbols of piece from
// https://www.namecheap.com/visual/font-generator/chess-symbols/
const getPieceUniCode = (piece) => {
    const uniCodePieces = {
        p: "♙",
        r: "♖",
        n: "♘",
        b: "♗",
        q: "♕",
        k: "♔",
        P: "♙",
        R: "♖",
        N: "♘",
        B: "♗",
        Q: "♕",
        K: "♔",
    }

    return uniCodePieces[piece.type] || ""
};


socket.on("playerRole", (role) => {
    playerRole = role;
    renderBoard();
})

socket.on("spectatorRole", () => {
    playerRole = null;
    renderBoard();
})

// chess.load() -> will load the fen equatino , which we will receive here and then send it to backend
socket.on("boardState", (fen) => {
    chess.load(fen);
    renderBoard();
})

// chess.move() -> will determine the valid move.
socket.on("move", (move) => {
    chess.move(move)

    renderBoard();
})


socket.on("capture", ({ color, piece }) => {
    capturedPieces[color].push(piece);
    defeatedPieces(); // Update the display when a piece is captured
});




