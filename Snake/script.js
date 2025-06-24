// === Canvas Setup ===
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
let gridSize = 15; // Größe der Blöcke (anpassbar für mehr Spieler)

// === Spiel-UI Elemente ===
let startScreen = document.getElementById('startScreen');
let startBtn = document.getElementById('startBtn');
let playBtn = document.getElementById('playBtn'); // "Erneut spielen" Button
let bgMusic = document.getElementById('bgMusic');

// === WebSocket Setup ===
let roomName = 'snake-arena';
let serverURL = 'wss://nosch.uber.space/web-rooms/';
let socket = new WebSocket(serverURL);
let clientId = null;

// === Spieler und Spielzustand ===
// Zufällige Startposition
let startX = Math.floor(Math.random() * (canvas.width / gridSize));
let startY = Math.floor(Math.random() * (canvas.height / gridSize));

let player = {
  id: null,                // Wird durch Server gesetzt
  body: [{ x: startX, y: startY }], // Startposition zufällig
  direction: 'right',
  color: getRandomColor(),
  active: true,
};

let otherPlayers = {}; // Andere Spieler
let grow = true;       // Ob die Snake wachsen soll

// === Hilfsfunktionen ===

// Zufällige Farbe für Spieler-Snake (5 Farben)
function getRandomColor() {
  let colors = ['#39ff14', '#ff073a', '#00ffff', '#fffb00', '#bf00ff'];
  return colors[Math.floor(Math.random() * colors.length)];
}


// Zeichnet ein Quadrat am Raster (x,y) mit Farbe
function drawBlock(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * gridSize, y * gridSize, gridSize - 2, gridSize - 2);
}

// Schlange bewegen
function moveSnake(snake) {
  if (!snake.active || !snake.body[0]) return;

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
    resetSnake(snake);
    return;
  }

  // Kollision mit sich selbst prüfen
  if (snake.body.some(segment => segment.x === head.x && segment.y === head.y)) {
    console.log('Kollision mit sich selbst!');
    resetSnake(snake);
    return;
  }

  // Kollision mit anderen Spielern prüfen (nur eigener Spieler)
  if (snake.id === player.id) {
    for (let id in otherPlayers) {
      let other = otherPlayers[id];
      for (let segment of other.body) {
        if (segment.x === head.x && segment.y === head.y) {
          console.log('Kollision mit anderem Spieler!');
          resetSnake(snake);
          return;
        }
      }
    }
  }

  // Kopf hinzufügen
  snake.body.unshift(head);

  // Wenn grow false, letztes Segment entfernen (Schlange bewegt sich ohne Wachstum)
  if (!grow) {
    snake.body.pop();
  } else {
    grow = false;
  }
}

// Schlange zurücksetzen (nach Tod)
function resetSnake(snake) {
  if (snake.id === player.id) {
    player.active = false;
    player.body = [];

    // Tod melden
    sendMessage('*broadcast-message*', ['player-died', player.id]);
    sendMessage('*broadcast-message*', ['position', player]);

    // Overlay zeigen und Button zentrieren
    document.getElementById("gameOverlay").style.display = "flex";

    let rect = canvas.getBoundingClientRect();
    playBtn.style.left = `${rect.left + rect.width / 2 - playBtn.offsetWidth / 2}px`;
    playBtn.style.top = `${rect.top + rect.height / 2 - playBtn.offsetHeight / 2}px`;

  } else {
    // Andere Spieler entfernen
    delete otherPlayers[snake.id];
  }
}

// Canvas zeichnen (eigene und andere Spieler)
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (player.active) {
    for (let segment of player.body) {
      drawBlock(segment.x, segment.y, player.color);
    }
  }

  for (let id in otherPlayers) {
    let p = otherPlayers[id];
    if (!p.active) continue;
    for (let segment of p.body) {
      drawBlock(segment.x, segment.y, p.color);
    }
  }

  requestAnimationFrame(draw);
}

// Nachrichten an WebSocket senden, wenn verbunden
function sendMessage(...msg) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  } else {
    console.warn('WebSocket ist noch nicht verbunden. Nachricht nicht gesendet:', msg);
  }
}

// === Tastatureingaben ===
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && player.direction !== 'down') player.direction = 'up';
  if (e.key === 'ArrowDown' && player.direction !== 'up') player.direction = 'down';
  if (e.key === 'ArrowLeft' && player.direction !== 'right') player.direction = 'left';
  if (e.key === 'ArrowRight' && player.direction !== 'left') player.direction = 'right';
});

// === WebSocket Ereignisse ===

socket.addEventListener('open', () => {
  sendMessage('*enter-room*', roomName);
  sendMessage('*subscribe-client-count*');
  sendMessage('*subscribe-client-enter-exit*');

  // Ping zum Verbinden aufrechterhalten
  setInterval(() => sendMessage('*ping*'), 30000);

  // Eigene Snake bewegen und Position senden (alle 200ms)
  setInterval(() => {
    if (player.active) {
      moveSnake(player);
      sendMessage('*broadcast-message*', ['position', player]);
    }
  }, 200);

  // Andere Snakes bewegen (alle 200ms)
  setInterval(() => {
    for (let id in otherPlayers) {
      moveSnake(otherPlayers[id]);
    }
  }, 200);

  // Wachstum alle 5 Sekunden
  setInterval(() => {
    grow = true;
  }, 5000);

  // Erste Position senden
  sendMessage('*broadcast-message*', ['position', player]);
});

socket.addEventListener('message', (event) => {
  if (!event.data) return;
  let msg = JSON.parse(event.data);
  let type = msg[0];

  switch (type) {
    case '*client-id*':
      clientId = msg[1];
      player.id = clientId;
      sendMessage('*broadcast-message*', ['position', player]);
      draw();  // Zeichnen starten
      break;

    case 'position':
      let other = msg[1];
      if (other.id !== clientId) {
        if (!otherPlayers[other.id]) {
          otherPlayers[other.id] = other;
        } else {
          otherPlayers[other.id].direction = other.direction;
          otherPlayers[other.id].active = other.active;
          otherPlayers[other.id].body = other.body.slice();
        }
      }
      break;

    case 'player-died':
      let deadId = msg[1];
      if (otherPlayers[deadId]) {
        otherPlayers[deadId].active = false;
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

// === Buttons ===

// Startbutton: Spiel starten und Musik abspielen
startBtn.addEventListener('click', () => {
  startScreen.style.display = 'none';
  document.getElementById("gameOverlay").style.display = "none";

  player.active = true;
  bgMusic.play().catch(e => console.log('Musik konnte nicht starten:', e));

  player.body = [{
    x: Math.floor(Math.random() * (canvas.width / gridSize)),
    y: Math.floor(Math.random() * (canvas.height / gridSize))
  }];
  player.direction = 'right';
  sendMessage('*broadcast-message*', ['position', player]);
});

// "Erneut spielen"-Button: Spiel neu starten, wenn tot
playBtn.addEventListener('click', () => {
  if (!player.active) {
    player.active = true;
    player.body = [{
      x: Math.floor(Math.random() * (canvas.width / gridSize)),
      y: Math.floor(Math.random() * (canvas.height / gridSize))
    }];
    player.direction = 'right';
    sendMessage('*broadcast-message*', ['position', player]);

    document.getElementById("gameOverlay").style.display = "none";
    bgMusic.play();
  }
});

// Spiel soll beim Laden nicht starten
player.active = false;

// Starte den Zeichenloop
draw();
