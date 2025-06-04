let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
let gridSize = 15; // Größe der Blöcke, lässt sich anpassen, wenn mehr Spieler drin sind

// HARDCORE MODE: In Zeile 96 und 101, die Intervalle auf 100ms und 1000ms einstellen, 
// dann ist das Spiel schneller und die Snakes wachsen schneller


//WebSocket integrieren
let roomName = 'snake-arena';
let serverURL = 'wss://nosch.uber.space/web-rooms/';
let socket = new WebSocket(serverURL);
let clientId = null;


//Zufällige Startposition für die Snakes
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

function resetSnake(snake) {
  if (snake.id === player.id) {
    player.active = false;
    player.body = []; // visuell entfernen

    sendMessage('*broadcast-message*', ['position', player]);

    document.getElementById("gameOverlay").style.display = "flex";


    // Positioniere ihn mittig über dem Canvas
    const rect = canvas.getBoundingClientRect();
    playBtn.style.left = `${rect.left + rect.width / 2 - playBtn.offsetWidth / 2}px`;
    playBtn.style.top = `${rect.top + rect.height / 2 - playBtn.offsetHeight / 2}px`;
  } else {
    delete otherPlayers[snake.id];
  }
}


//Kopf kopieren, um zu bewegen
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
    head.x < 0 || head.x >= canvas.width / gridSize || //Wenn head X kleiner als 0 oder größer als Spielfeld ist, wird Bewegung blockiert
    head.y < 0 || head.y >= canvas.height / gridSize   //Wenn head y kleiner als 0 oder größer als Spielfeld ist, wird Bewegung blockiert
  ) {
     resetSnake(snake);
    return; // blockiere Bewegung, wenn außerhalb   
  }         //GridSize ist der Faktor, durch den wir die Breite + Höhe des Canvas teilen, um die Anzahl der Blöcke zu erhalten

  if (snake.body.some(segment => segment.x === head.x && segment.y === head.y)) {
    console.log('Kollision mit sich selbst!');
     resetSnake(snake);
    return;
  }

  // 🧠 Kollision mit anderen Spielern (nur für eigenen Spieler prüfen!)
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

  //Schlange wächst
  snake.body.unshift(head);

  if (!grow) {          // Wir bewegen uns alle 200ms (Z. 96) um einen Block in unserem Grid, 
    snake.body.pop();  //  in dem immer ein Kopf vorne hinzugefügt wird, und hinten wieder einer gelöscht wird
  } else {            //   Alle 5 Sekunden (Z.101) wird ein "Kopf" hinzugefügt, welcher nicht gelöscht wird, und die Snake wächst.
    grow = false;
  }
}


//Quadrat zeichnen
function drawBlock(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * gridSize, y * gridSize, gridSize - 2, gridSize - 2); // Quadratische Blöcke, Rechteckig sieht komisch aus bei rotation 
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Canvas wird aktualisiert und aufgeräumt, um einen Ghost Effekt zu vermeiden

  // eigene Snake zeichnen
  for (let segment of player.body) {
    drawBlock(segment.x, segment.y, player.color); // Jedes Segment wird als Block gezeichnet
  }

  // andere Spieler zeichnen
  for (let id in otherPlayers) {
    let p = otherPlayers[id]; // Spieler-Objekt abrufen
    for (let segment of p.body) {
      drawBlock(segment.x, segment.y, p.color); //Jedes Segment der anderen Schlange zeichnen
    }
  }

  requestAnimationFrame(draw);
}


// Snake automatisch bewegen
setInterval(() => {
  moveSnake(player);
  sendMessage('*broadcast-message*', ['position', player]); //sendet an andere Spieler die Position
}, 200); // alle 200 ms Bewegung

// Andere Spieler lokal ebenfalls bewegen (Simulation der Bewegung)
setInterval(() => {
  for (let id in otherPlayers) {
    moveSnake(otherPlayers[id]);
  }
},200);


// Snake wächst alle 5 Sekunden
setInterval(() => {
  grow = true;
}, 5000);

function getRandomColor() { // Gibt eine zufällige Farbe aus 5 Optionen aus. Spiel für 5 Spieler
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


//Nachricht an Server
function sendMessage(...msg) {
  socket.send(JSON.stringify(msg));
}

socket.addEventListener('open', () => {
  sendMessage('*enter-room*', roomName); // Raum betreten
  sendMessage('*subscribe-client-count*'); //Spieleranzahl abonnieren
  sendMessage('*subscribe-client-enter-exit*'); // Beitritte/Verlassen abonnieren
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
    if (!otherPlayers[other.id]) {
      // Falls Spieler neu ist, initialisieren
      otherPlayers[other.id] = other;
    } else {
      // Nur direction und Position updaten
      otherPlayers[other.id].direction = other.direction;

      // Option 1: Nur Kopfposition aktualisieren (nicht ganze body überschreiben)
      // Optional: falls du dem Server mehr vertraust als der lokalen Simulation,
      // dann kannst du auch entire body nehmen – das ist ein Design-Entscheid.

      // Option 2 (besser sichtbar): Nehme nur body[0] vom Server und ergänze die Schlange lokal
      otherPlayers[other.id].body[0] = other.body[0];
    }
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
