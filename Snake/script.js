let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
let gridSize = 20;

let roomName = 'snake-room';
let serverURL = 'wss://nosch.uber.space/web-rooms/';
let socket = new WebSocket(serverURL);

let clientId = null;

let startX = Math.floor(Math.random() * (canvas.width / gridSize));
let startY = Math.floor(Math.random() * (canvas.height / gridSize));

let player = {
  id: null,
  body: [{ x: startX, y: startY }],
  direction: 'right',
  color: getRandomColor(),
};

let otherPlayers = {};
let grow = false;

// Tasteneingaben → Richtung ändern
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && player.direction !== 'down') player.direction = 'up';
  if (e.key === 'ArrowDown' && player.direction !== 'up') player.direction = 'down';
  if (e.key === 'ArrowLeft' && player.direction !== 'right') player.direction = 'left';
  if (e.key === 'ArrowRight' && player.direction !== 'left') player.direction = 'right';
});

function moveSnake(snake) {
  let head = { ...snake.body[0] };

  switch (snake.direction) {
    case 'up': head.y -= 1; break;
    case 'down': head.y += 1; break;
    case 'left': head.x -= 1; break;
    case 'right': head.x += 1; break;
  }

  // Spielfeldgrenzen prüfen
  if (
    head.x < 0 || head.x >= canvas.width / gridSize ||
    head.y < 0 || head.y >= canvas.height / gridSize
  ) {
    return; // blockiere Bewegung, wenn außerhalb
  }

  snake.body.unshift(head);

  if (!grow) {
    snake.body.pop();
  } else {
    grow = false;
  }
}


function drawBlock(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * gridSize, y * gridSize, gridSize - 2, gridSize - 2);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // eigene Snake zeichnen
  for (let segment of player.body) {
    drawBlock(segment.x, segment.y, player.color);
  }

  // andere Spieler
  for (const id in otherPlayers) {
    const p = otherPlayers[id];
    for (let segment of p.body) {
      drawBlock(segment.x, segment.y, p.color);
    }
  }

  requestAnimationFrame(draw);
}

// Snake automatisch bewegen
setInterval(() => {
  moveSnake(player);
  sendMessage('*broadcast-message*', ['position', player]);
}, 200); // alle 200 ms Bewegung

// Snake wächst alle 5 Sekunden
setInterval(() => {
  grow = true;
}, 7000);

function getRandomColor() {
  const colors = ['#e63946', '#f1fa8c', '#06d6a0', '#118ab2', '#ff9f1c'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function sendMessage(...msg) {
  socket.send(JSON.stringify(msg));
}

socket.addEventListener('open', () => {
  sendMessage('*enter-room*', roomName);
  sendMessage('*subscribe-client-count*');
  sendMessage('*subscribe-client-enter-exit*');
  setInterval(() => socket.send(''), 30000); // Verbindung halten
});

socket.addEventListener('message', (event) => {
  if (!event.data) return;
  const msg = JSON.parse(event.data);
  const type = msg[0];

  switch (type) {
    case '*client-id*':
      clientId = msg[1];
      player.id = clientId;
      sendMessage('*broadcast-message*', ['position', player]);
      draw();
      break;

    case 'position':
      const other = msg[1];
      if (other.id !== clientId) {
        otherPlayers[other.id] = other;
      }
      break;

    case '*client-exit*':
      const leftId = msg[1];
      delete otherPlayers[leftId];
      break;

    case '*error*':
      console.warn('Server error:', msg[1]);
      break;
  }
});
