const socket = io();
const chess = new Chess()
const boardElement = document.querySelector('.chessboard');

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

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
};

const handleMove = () => {

};

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

renderBoard()


