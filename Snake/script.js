let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
let playBtn = document.getElementById("playBtn");
let gridSize = 15; // Größe der Blöcke, lässt sich anpassen, wenn mehr Spieler drin sind

// HARDCORE MODE: In Zeile 96 und 101, die Intervalle auf 100ms und 1000ms einstellen, 
// dann ist das Spiel schneller und die Snakes wachsen schneller

// WebSocket integrieren
let roomName = 'snake-arena';
let serverURL = 'wss://nosch.uber.space/web-rooms/';
let socket = new WebSocket(serverURL);
let clientId = null;

// Zufällige Startposition für die Snakes
let startX = Math.floor(Math.random() * (canvas.width / gridSize));
let startY = Math.floor(Math.random() * (canvas.height / gridSize));

// Spieler Eigenschaften, werden in der draw Funktion genutzt (Z.68-90)
let player = {
  id: null, // wird später gesetzt, dient zur Unterscheidung der Spieler
  body: [{ x: startX, y: startY }], // "Spawnt" Spieler an random Position im Canvas
  direction: 'right', 
  color: getRandomColor(),
  active: true,
};

// Wenn true wächst die Snake, sonst nicht
let otherPlayers = {}; // Andere Spieler werden in einem Array gespeichert, damit sie gezeichnet werden können
let grow = true;

// Tasteneingaben -> Richtung ändern
document.addEventListener('keydown', (e) => { // Wenn Pfeiltaste nicht entgegengesetzte Snake Richtung -> Player Direction wird aktualisiert
  if (e.key === 'ArrowUp' && player.direction !== 'down') player.direction = 'up';
  if (e.key === 'ArrowDown' && player.direction !== 'up') player.direction = 'down';
  if (e.key === 'ArrowLeft' && player.direction !== 'right') player.direction = 'left';
  if (e.key === 'ArrowRight' && player.direction !== 'left') player.direction = 'right';
});

// Snake zurücksetzen
function resetSnake(snake) {
  if (snake.id === player.id) { // oder hier 
    player.active = false; // Spezifische ID des getroffenen Spielers soll angesprochen werden, nur bei dieser Zeile
    player.body = []; // visuell entfernen

    // Änderung: Sende explizit ID des gestorbenen Spielers
    sendMessage('*broadcast-message*', ['player-died', player.id]);
    sendMessage('*broadcast-message*', ['position', player]);

    document.getElementById("gameOverlay").style.display = "flex";

    // Positioniere Game-Overlay und Button zentral über Canvas
    let rect = canvas.getBoundingClientRect();
    playBtn.style.left = `${rect.left + rect.width / 2 - playBtn.offsetWidth / 2}px`;
    playBtn.style.top = `${rect.top + rect.height / 2 - playBtn.offsetHeight / 2}px`;
  } else {
    delete otherPlayers[snake.id]; // entfernt andere Spieler wenn tot
  }
}

// Kopf kopieren, um zu bewegen
function moveSnake(snake) {
  if (!snake.active) return;
  let head = { ...snake.body[0] };

  // Bewegung in gewünschte Richtung, außer sie kommt aus der entgegengesetzten Richtung 
  switch (snake.direction) {
    case 'up': head.y -= 1; break;
    case 'down': head.y += 1; break;
    case 'left': head.x -= 1; break;
    case 'right': head.x += 1; break;
  }

  // Spielfeldgrenzen prüfen
  if (
    head.x < 0 || head.x >= canvas.width / gridSize || // Wenn head X kleiner als 0 oder größer als Spielfeld ist, wird Bewegung blockiert
    head.y < 0 || head.y >= canvas.height / gridSize   // Wenn head y kleiner als 0 oder größer als Spielfeld ist, wird Bewegung blockiert
  ) {
    resetSnake(snake);
    return; // blockiere Bewegung, wenn außerhalb   
  }

  if (snake.body.some(segment => segment.x === head.x && segment.y === head.y)) {
    console.log('Kollision mit sich selbst!');
    resetSnake(snake);
    return;
  }

  // Kollision mit anderen Spielern (nur für eigenen Spieler prüfen)
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

  // Schlange wächst
  snake.body.unshift(head);

  if (!grow) {          
    snake.body.pop();  
  } else {            
    grow = false;
  }
}

// Quadrat zeichnen
function drawBlock(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * gridSize, y * gridSize, gridSize - 2, gridSize - 2);
}

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

// INTERVALLE werden erst NACH WebSocket-Verbindung gestartet (weiter unten im socket.addEventListener)

// Zufallsfarbe
function getRandomColor() {
  let colors = ['#e63946', '#f1fa8c', '#06d6a0', '#118ab2', '#ff9f1c'];
  return colors[Math.floor(Math.random() * colors.length)];
}

document.getElementById("playBtn").addEventListener("click", () => {
  if (!player.active) {
    player.active = true;
    player.body = [{
      x: Math.floor(Math.random() * (canvas.width / gridSize)),
      y: Math.floor(Math.random() * (canvas.height / gridSize))
    }];
    player.direction = 'right';
    sendMessage('*broadcast-message*', ['position', player]);

    document.getElementById("gameOverlay").style.display = "none";
  }
});

// Nachricht an Server
function sendMessage(...msg) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  } else {
    console.warn("WebSocket ist noch nicht offen. Nachricht wird verworfen:", msg);
  }
}

socket.addEventListener('open', () => {
  sendMessage('*enter-room*', roomName);
  sendMessage('*subscribe-client-count*');
  sendMessage('*subscribe-client-enter-exit*');

  // Alle Intervall-Starts HIER, nach erfolgreicher Verbindung:

  setInterval(() => {
    if (player.active) {
      moveSnake(player);
      sendMessage('*broadcast-message*', ['position', player]);
    }
  }, 200);

  setInterval(() => {
    for (let id in otherPlayers) {
      moveSnake(otherPlayers[id]);
    }
  }, 200);

  setInterval(() => {
    grow = true;
  }, 5000);

  setInterval(() => socket.send(''), 30000); // Verbindung halten
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
      draw();
      break;

    case 'position':
      let other = msg[1];
      if (other.id !== clientId) {
        if (!otherPlayers[other.id]) {
          otherPlayers[other.id] = other;
        } else {
          otherPlayers[other.id].direction = other.direction;
          otherPlayers[other.id].active = other.active;
          otherPlayers[other.id].body[0] = other.body[0];
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

draw();

function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

if (isMobileDevice()) {
  document.getElementById("mobileControls").style.display = "flex";
}

document.getElementById('btn-up').addEventListener('click', () => {
  if (player.direction !== 'down') player.direction = 'up';
});
document.getElementById('btn-down').addEventListener('click', () => {
  if (player.direction !== 'up') player.direction = 'down';
});
document.getElementById('btn-left').addEventListener('click', () => {
  if (player.direction !== 'right') player.direction = 'left';
});
document.getElementById('btn-right').addEventListener('click', () => {
  if (player.direction !== 'left') player.direction = 'right';
});


