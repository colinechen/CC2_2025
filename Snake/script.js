let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
let gridSize = 20;

let roomName = 'snake-room';
let serverURL = 'wss://nosch.uber.space/web-rooms/';
let socket = new WebSocket(serverURL);

let clientId = null;

let player = {
  id: null,
  x: Math.floor(Math.random() * (canvas.width / gridSize)),
  y: Math.floor(Math.random() * (canvas.height / gridSize)),
  color: getRandomColor(),
};

let otherPlayers = {}; // andere Spieler

// Steuerung: Pfeiltasten
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') player.y -= 1;
  if (e.key === 'ArrowDown') player.y += 1;
  if (e.key === 'ArrowLeft') player.x -= 1;
  if (e.key === 'ArrowRight') player.x += 1;

  sendMessage('*broadcast-message*', ['position', player]);
});

function drawBlock(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * gridSize, y * gridSize, gridSize -1, gridSize - 2);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBlock(player.x, player.y, player.color);

  for (const id in otherPlayers) {
    const p = otherPlayers[id];
    drawBlock(p.x, p.y, p.color);
  }

  requestAnimationFrame(draw);
}

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