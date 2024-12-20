const socket = io();
const chess = new Chess()
const boardElement = document.querySelector('.chessboard');
const buzzerSound = new Audio('/sounds/buzzer.mp3');
const captureSound = new Audio('/sounds/capture.mp3');
const moveSound = new Audio('/sounds/move.mp3');

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
const capturedPieces = { white: [], black: [] }; // Store captured pieces

// server mathi mde che
const roomId = "<%= roomId %>";
// unable to fetch name from the server
// using URLSearchParams to get the name from the URL
const urlParams = new URLSearchParams(window.location.search);
const name = urlParams.get('name');


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

// Function to prompt user for promotion choice
// This will be used when a pawn reaches the opposite end of the board
function promptPromotionChoice() {
    return new Promise((resolve) => {
        const choice = prompt("Choose promotion piece (q - Queen, r - Rook, b - Bishop, n - Knight):", "q");
        const validChoices = ['q', 'r', 'b', 'n'];

        // Default to Queen if input is invalid
        resolve(validChoices.includes(choice) ? choice : 'q');
    });
}

// here we are using concept of ascii value
// in chess col are defined as a,b,c,...
// and rows rows are defined as 1 to 8
// lets say it is first box so 8th row and ath col
// so 97 + 0 and 8 - 8
// Function to handle moves and track captures
const handleMove = async (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    };

    // Detect if a promotion is possible
    const piece = chess.get(move.from);
    if (piece && piece.type === 'p' && (move.to.endsWith('8') || move.to.endsWith('1'))) {
        // Show a prompt or modal to choose the promotion piece
        const promotionChoice = await promptPromotionChoice();
        move.promotion = promotionChoice;
    }

    const result = chess.move(move);

    // Play the move sound when a valid move is made
    if (result) {
        console.log("Playing move sound");
        moveSound.play().catch(err => {
            console.error("Failed to play move sound:", err);
        });
    } else {
        // this "else" means invalid move
        // Play the buzzer sound when an invalid move is made
        console.log("Invalid move - playing buzzer sound");
        buzzerSound.play().catch(err => {
            console.error("Failed to play buzzer sound:", err);
        })
        return;
    }




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

        // Play the capture sound when a piece is captured
        console.log("Piece captured - playing capture sound");
        captureSound.play().catch(err => {
            console.error("Failed to play capture sound:", err);
        })

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
        } else if (playerRole === 'b') {
            rightContainer.append(pieceElem); // Always on the right side
        } else {
            leftContainer.append(pieceElem); // Always on the left side
        }
    });

    // Show all defeated black pieces on the right side
    capturedPieces.black.forEach(piece => {
        const pieceElem = document.createElement("div");
        pieceElem.classList.add("piece", "captured", "black");
        pieceElem.innerText = getPieceUniCode({ type: piece.toLowerCase() });
        if (playerRole === 'b') {
            leftContainer.append(pieceElem); // Always on the right side
        } else if (playerRole === 'w') {
            rightContainer.append(pieceElem); // Always on the left side
        } else {
            rightContainer.append(pieceElem); // Always on the
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


// append the name of the player
const nameInput = document.querySelector('.name');
nameInput.innerText = `Name: ${name}`;
const naam = document.createElement('h1');
nameInput.append(naam);

// 1. get the element of name class
// 2. create a h1 element
// 3. append the player element initially
// 4. update the player's displayed role
// use this in playerRole socket and spectatorRole socket
const userColor = document.querySelector('.player-color');
const Player = document.createElement('h1');
userColor.append(Player); // Append the player element initially

// Function to update the player's displayed role
const updatePlayerRoleDisplay = () => {
    if (playerRole === 'w') {
        Player.innerText = "Player: White";
    } else if (playerRole === 'b') {
        Player.innerText = "Player: Black";
    } else {
        Player.innerText = "Player: Spectator";
    }
};


function checkturn() {
    const turn = document.querySelector('.turn');
    const turnElement = document.createElement('h1');
    turn.append(turnElement);
    if (chess.turn() === 'w') {
        turn.innerText = "White's turn";
    } else {
        turn.innerText = "Black's turn";
    }
}

socket.on("playerRole", (role) => {
    playerRole = role;
    updatePlayerRoleDisplay();
    checkturn();
    renderBoard();
})

socket.on("spectatorRole", () => {
    playerRole = null;
    checkturn();
    updatePlayerRoleDisplay();
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
    checkturn();
    renderBoard();
})


socket.on("capture", ({ color, piece }) => {
    capturedPieces[color].push(piece);
    defeatedPieces(); // Update the display when a piece is captured
});




