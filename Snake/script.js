//  Canvas
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
let gridSize = 15; // Größe der Blöcke

// Html Elemente
let startScreen = document.getElementById('startScreen');
let startBtn = document.getElementById('startBtn');
let playBtn = document.getElementById('playBtn'); 
let bgMusic = document.getElementById('bgMusic');

//  WebSocket Setup 
let roomName = 'snake-arena';
let serverURL = 'wss://nosch.uber.space/web-rooms/';
let socket = new WebSocket(serverURL);
let clientId = null; //muss gesetzt werden, damits später aufgerufen werden kann

//  Spieler und Spielzustand 
// Zufällige Startposition
let startX = Math.floor(Math.random() * (canvas.width / gridSize)); //MAth.floor schneidet Nachkommastelle ab
let startY = Math.floor(Math.random() * (canvas.height / gridSize)); 

let player = {
  id: null,                // Wird durch Server gesetzt
  body: [{ x: startX, y: startY }], // Startposition zufällig
  direction: 'right',
  color: getRandomColor(), // eine Farbe wird zufällig aus Farbpool gesetzt (Z. 38)
  active: true,     
};

let otherPlayers = {}; // Leeres Objekt: Andere Spieler werden gespeichert
let grow = true;       // Kontrolle, Ob die Snake wachsen soll



// Zufällige Farbe für Snake
function getRandomColor() {
  let colors = ['#39ff14', '#ff073a', '#00ffff', '#fffb00', '#bf00ff', '#FF10F0', '#FFB300', '#A1FF0A', '#00FFEF'];
  return colors[Math.floor(Math.random() * colors.length)];
}


// Zeichnet Quadrat am Raster (x,y) mit Farbe/ Abstand (gridsize -2 für x + y)
function drawBlock(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * gridSize, y * gridSize, gridSize - 2, gridSize - 2); // gezeichnet auf x und y Achse und Abstand zwischen Segmenten
}

// Schlange bewegen
function moveSnake(snake) {
  if (!snake.active || !snake.body[0]) return; //Funktion bricht ab, wenn Schlange nicht aktiv oder keinen Kopf hat

  //Spread Operator
  let head = { ...snake.body[0] }; //Kopfposition wird kopiert


  switch (snake.direction) {    //Canvas-Ursprung oben links -> hoch: -1 auf y, runter: +1 auf y, links rechts halt
    case 'up': head.y -= 1; break;
    case 'down': head.y += 1; break;
    case 'left': head.x -= 1; break;
    case 'right': head.x += 1; break;
  }

  // Kolliosion Spielfeldgrenzen prüfen
  if (
    head.x < 0 || head.x >= canvas.width / gridSize || 
    head.y < 0 || head.y >= canvas.height / gridSize
  ) {
    resetSnake(snake);
    return;
  }

  // Kollision mit sich selbst prüfen
  if (snake.body.some(segment => segment.x === head.x && segment.y === head.y)) {
    console.log('Kollision mit sich selbst');
    resetSnake(snake);
    return;
  }

  // Kollision mit anderen Spielern prüfen (nur eigener Spieler)
  if (snake.id === player.id) {
    for (let id in otherPlayers) { //id Mitspieler
      let other = otherPlayers[id]; 
      for (let segment of other.body) { //Schleife durch jedes Segment
        if (segment.x === head.x && segment.y === head.y) {
          console.log('Kollision mit anderem Spieler');
          resetSnake(snake);
          return;
        }
      }
    }
  }

  // Kopf hinzufügen um bewegen (Vorne dazu, hinten weg, vorne dazu, hinten weg, ...... -> Bewegung)
  snake.body.unshift(head);

  // Wenn grow false, letztes Segment entfernen (Schlange bewegt sich ohne zu wachsen
  if (!grow) {                // Vorne dazu, hinten weg, vorne dazu, hinten weg, ...... -> Bewegung)
    snake.body.pop();
  } else {
    grow = false;
  }
}


// Schlange zurücksetzen (nach Tod)
function resetSnake(snake) {
  if (snake.id === player.id) { //geprüft, ob meine oder andere Schlange
    player.active = false;
    player.body = []; //Körper wird gelöscht

    // Tod melden
    sendMessage('*broadcast-message*', ['player-died', player.id]); //id des toten Spielers 
    sendMessage('*broadcast-message*', ['position', player]); //Sendet toten Körper -> verschwindet

    // Overlay zeigen und Button zentrieren
    document.getElementById("gameOverlay").style.display = "flex";

    //Restart Button zentrieren
    let rect = canvas.getBoundingClientRect(); //Position und Größe Canvas für Overlay
    playBtn.style.left = `${rect.left + rect.width / 2 - playBtn.offsetWidth / 2}px`; //Hälfte der Button Breite -> mittig
    playBtn.style.top = `${rect.top + rect.height / 2 - playBtn.offsetHeight / 2}px`;

  } else {
    // Andere Spieler entfernen, wenn nicht der eigene ist
    delete otherPlayers[snake.id];
  }
}


// Canvas zeichnen (eigene und andere Spieler)
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); //Canvas wird gelöscht (keine alten Schlangen zusehen)

  if (player.active) {
    for (let segment of player.body) { //nur wenn Spieler lebt
      drawBlock(segment.x, segment.y, player.color); //Snake Segment zeichnen
    }
  }

  for (let id in otherPlayers) { //andere Spieler durchgehen
    let p = otherPlayers[id]; //nur aktive Spieler zeichnen
    if (!p.active) continue;
    for (let segment of p.body) { 
      drawBlock(segment.x, segment.y, p.color); //Segmente zeichnen
    }
  }

  requestAnimationFrame(draw); //draw Funktion immer wieder neu aufrufen
}



//  Tastatureingaben 
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && player.direction !== 'down') player.direction = 'up';
  if (e.key === 'ArrowDown' && player.direction !== 'up') player.direction = 'down';
  if (e.key === 'ArrowLeft' && player.direction !== 'right') player.direction = 'left';
  if (e.key === 'ArrowRight' && player.direction !== 'left') player.direction = 'right';
});

//  Touch-Button für Handys (Selbes Spiel wie Tastatureingaben)
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


//WebSocket Ereignisse

// Nachrichten an WebSocket senden, wenn verbunden
function sendMessage(...msg) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  } else {
    console.warn('WebSocket ist nicht verbunden. Nachricht nicht gesendet', msg);
  }
}

socket.addEventListener('open', () => { //WebSocket Verbindung offen
  sendMessage('*enter-room*', roomName);
  sendMessage('*subscribe-client-count*');
  sendMessage('*subscribe-client-enter-exit*');

  // Ping zum Verbinden aufrechterhalten
  setInterval(() => sendMessage('*ping*'), 30000);

  // Eigene Snake bewegen und Position an Server senden (alle 200ms)
  setInterval(() => {
    if (player.active) {
      moveSnake(player);
      sendMessage('*broadcast-message*', ['position', player]);
    }
  }, 200);


  // Andere Snakes bewegen und senden (alle 200ms)
  setInterval(() => {
    for (let id in otherPlayers) {
      moveSnake(otherPlayers[id]);
    }
  }, 200);

  // Wachstum alle 5 Sekunden
  setInterval(() => {
    grow = true;
  }, 5000);


  // Beim Spielstart sofort Anfangsposition senden
  sendMessage('*broadcast-message*', ['position', player]);
});

//WebSocket Nachrichten 
socket.addEventListener('message', (event) => {
  if (!event.data) return;
  let msg = JSON.parse(event.data); //wird in JSON wird umgewandelt
  let type = msg[0]; //Welche Info enthält Message

  switch (type) {
    case '*client-id*':
      clientId = msg[1]; //speichert clientId
      player.id = clientId; //verbindet Id mit Spielerobjekt
      sendMessage('*broadcast-message*', ['position', player]); //teilt Position mit anderen
      draw(); 
      break;

      //Positionsdaten anderer Spieler
    case 'position':
      let other = msg[1];
      if (other.id !== clientId) { //geprüft, nicht der eigene Spieler
        if (!otherPlayers[other.id]) {
          otherPlayers[other.id] = other; // neuer Spieler wird zu otherPlayers hinzugefügt
        } else {
          otherPlayers[other.id].direction = other.direction; //wenn spieler bekannt, dann Daten einfach aktualisiert
          otherPlayers[other.id].active = other.active;
          otherPlayers[other.id].body = other.body.slice();
        }
      }
      break;

      //Server teilt mit, dass anderer Spieler tot
    case 'player-died':
      let deadId = msg[1];
      if (otherPlayers[deadId]) {
        otherPlayers[deadId].active = false;
      }
      break;

      //Server teilt mit, dass Spieler verlassen
    case '*client-exit*':
      const leftId = msg[1];
      delete otherPlayers[leftId];
      break;

      //Fehler vom Server
    case '*error*':
      console.warn('Server error:', msg[1]);
      break;
  }
});


// Buttons

// Startbutton: Spiel starten und Musik abspielen
startBtn.addEventListener('click', () => {
  startScreen.style.display = 'none';
  document.getElementById("gameOverlay").style.display = "none";

  player.active = true;
  bgMusic.play().catch(e => console.log('Musik startet nicht', e));

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

// Spiel soll beim Laden nicht starten -> muss erst start Button betätigen
player.active = false;

// Starte Zeichenloop
draw();
