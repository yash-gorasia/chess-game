const { Chess } = require("chess.js");

const socket = io();

const chess = new Chess();

const boardElement = document.querySelector('#chessboard');

