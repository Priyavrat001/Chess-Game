import express from "express";
import { Server as SocketIOServer } from "socket.io";
import http from 'http';
import path from "path";
import { Chess } from 'chess.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);
const port = 3000;

const chess = new Chess();
const players = {};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess game" });
});

io.on("connection", function (socket) {
    console.log("connected");

    if (!players.white) {
        players.white = socket.id;
        socket.emit("playerRole", "w");
        socket.emit("boardState", chess.fen());
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit("playerRole", "b");
        socket.emit("boardState", chess.fen());
    } else {
        socket.emit("spectatorRole");
        socket.emit("boardState", chess.fen());
    }

    socket.on("disconnect", function () {
        console.log("disconnected");

        if (socket.id === players.white) {
            delete players.white;
        } else if (socket.id === players.black) {
            delete players.black;
        }
    });

    socket.on("move", function (move) {
        try {
            if (chess.turn() === "w" && socket.id !== players.white) return;
            if (chess.turn() === "b" && socket.id !== players.black) return;

            const result = chess.move(move);

            if (result) {
                io.emit("move", move);
                io.emit("boardState", chess.fen());
            } else {
                console.log("Invalid move: ", move);
                socket.emit("invalidMove", move);
            }
        } catch (error) {
            console.log(error);
            socket.emit("invalidMove", move);
        }
    });
});

server.listen(port, () => {
    console.log(`server is running on ${port}`);
});