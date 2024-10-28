const canvas = document.getElementById('tetris-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startButton = document.getElementById('start-button');

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    '#FF0D72',
    '#0DC2FF',
    '#0DFF72',
    '#F538FF',
    '#FF8E0D',
    '#FFE138',
    '#3877FF'
];

let grid = createGrid();
let score = 0;
let gameOver = false;
let requestId;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

const PIECES = [
    [[[1, 1, 1, 1]], [[1], [1], [1], [1]]],
    [[1, 1], [1, 1]],
    [[[0, 1, 0], [1, 1, 1]], [[1, 0], [1, 1], [1, 0]], [[1, 1, 1], [0, 1, 0]], [[0, 1], [1, 1], [0, 1]]],
    [[[1, 0, 0], [1, 1, 1]], [[1, 1], [1, 0], [1, 0]], [[1, 1, 1], [0, 0, 1]], [[0, 1], [0, 1], [1, 1]]],
    [[[0, 0, 1], [1, 1, 1]], [[1, 0], [1, 0], [1, 1]], [[1, 1, 1], [1, 0, 0]], [[1, 1], [0, 1], [0, 1]]],
    [[[1, 1, 0], [0, 1, 1]], [[0, 1], [1, 1], [1, 0]]],
    [[[0, 1, 1], [1, 1, 0]], [[1, 0], [1, 1], [0, 1]]]
];

let piece = {
    pos: {x: 0, y: 0},
    shape: null,
    rotationIndex: 0,
    pieceIndex: 0
};

function createGrid() {
    return Array.from({length: ROWS}, () => Array(COLS).fill(0));
}

function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    grid.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                drawBlock(x, y, COLORS[value]);
            }
        });
    });

    if (piece.shape) {
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    drawBlock(x + piece.pos.x, y + piece.pos.y, COLORS[value]);
                }
            });
        });
    }
}

function merge() {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                grid[y + piece.pos.y][x + piece.pos.x] = value;
            }
        });
    });
}

function isValidMove(piece, grid, offsetX = 0, offsetY = 0) {
    return piece.shape.every((row, dy) =>
        row.every((value, dx) =>
            value === 0 ||
            (piece.pos.x + dx + offsetX >= 0 &&
             piece.pos.x + dx + offsetX < COLS &&
             piece.pos.y + dy + offsetY < ROWS &&
             (grid[piece.pos.y + dy + offsetY] === undefined ||
              grid[piece.pos.y + dy + offsetY][piece.pos.x + dx + offsetX] === 0))
        )
    );
}

function playerMove(dir) {
    piece.pos.x += dir;
    if (!isValidMove(piece, grid)) {
        piece.pos.x -= dir;
    }
}

function playerDrop() {
    piece.pos.y++;
    if (!isValidMove(piece, grid)) {
        piece.pos.y--;
        merge();
        resetPiece();
        removeRows();
    }
    dropCounter = 0;
}

function playerRotate() {
    if (!piece.shape) return;
    
    const pieceSet = PIECES[piece.pieceIndex];
    const nextRotationIndex = (piece.rotationIndex + 1) % pieceSet.length;
    const nextShape = pieceSet[nextRotationIndex];

    const originalShape = piece.shape;
    const originalX = piece.pos.x;
    const originalY = piece.pos.y;
    
    piece.shape = nextShape.map(row => Array.isArray(row) ? [...row] : [row]);
    
    const kicks = [
        [0, 0],
        [-1, 0],
        [1, 0],
        [0, -1],
        [-1, -1],
        [1, -1],
        [-2, 0],
        [2, 0],
        [0, -2]
    ];
    
    let validRotation = false;
    for (let [kickX, kickY] of kicks) {
        piece.pos.x = originalX + kickX;
        piece.pos.y = originalY + kickY;
        if (isValidMove(piece, grid)) {
            validRotation = true;
            piece.rotationIndex = nextRotationIndex;
            break;
        }
    }
    
    if (!validRotation) {
        piece.shape = originalShape;
        piece.pos.x = originalX;
        piece.pos.y = originalY;
    }
}

function removeRows() {
    let rowsCleared = 0;
    outer: for (let y = grid.length - 1; y >= 0; y--) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] === 0) {
                continue outer;
            }
        }
        const row = grid.splice(y, 1)[0].fill(0);
        grid.unshift(row);
        y++;
        rowsCleared++;
    }
    if (rowsCleared > 0) {
        score += [40, 100, 300, 1200][rowsCleared - 1];
        updateScore();
    }
}

function resetPiece() {
    piece.pieceIndex = Math.floor(Math.random() * PIECES.length);
    const pieceSet = PIECES[piece.pieceIndex];
    piece.shape = pieceSet[0].map(row => Array.isArray(row) ? [...row] : [row]);
    piece.rotationIndex = 0;
    piece.pos.y = 0;
    piece.pos.x = Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2);
    if (!isValidMove(piece, grid)) {
        grid = createGrid();
        score = 0;
        updateScore();
        gameOver = true;
        cancelAnimationFrame(requestId);
        drawGameOver();
    }
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillText(`得分: ${score}`, canvas.width / 2, canvas.height / 2 + 30);
}

function updateScore() {
    scoreElement.textContent = `分数: ${score}`;
}

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    draw();
    requestId = requestAnimationFrame(update);
}

function startGame() {
    if (requestId) {
        cancelAnimationFrame(requestId);
    }
    grid = createGrid();
    score = 0;
    updateScore();
    resetPiece();
    gameOver = false;
    lastTime = 0;
    dropCounter = 0;
    dropInterval = 1000;
    update();
}

document.addEventListener('keydown', event => {
    if (gameOver) return;
    switch(event.key) {
        case 'ArrowLeft':
            playerMove(-1);
            break;
        case 'ArrowRight':
            playerMove(1);
            break;
        case 'ArrowDown':
            playerDrop();
            break;
        case 'ArrowUp':
            playerRotate();
            break;
    }
});

startButton.addEventListener('click', startGame);
