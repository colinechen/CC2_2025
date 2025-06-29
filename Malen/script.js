document.addEventListener('DOMContentLoaded', () => {
  let scene = document.querySelector("a-scene");
  let colorLabel = document.getElementById("selectedColorLabel");
  let paintSound = document.getElementById("paintSound");

  let selectedColor = null;
  let selectedNumber = null;

  let palette = {
    1: '#ffd1dc',
    2: '#a8dadc',
    3: '#c1e1c1',
    4: '#fff3b0',
    5: 'brown',
    6: 'black'
  };


  //zufälliges Motiv erstellen und in Szene setzen
  function initBlocks() {
    let keys = Object.keys(motifs); //Holt Schlüssel (Namen) aus motifs.js
    let chosenKey = keys[Math.floor(Math.random() * keys.length)]; //zufälliges Motiv
    let chosenMotif = motifs[chosenKey]; //holt Motiv
    let blockSize = 0.3; //Blockgröße

    //Container Element für Blöcke -> vor Kamera platziert
    let blockContainer = document.createElement("a-entity");
    blockContainer.setAttribute("id", "blockContainer");
    blockContainer.setAttribute("position", "0 2.2 3");
    blockContainer.setAttribute("rotation", "0 180 0");

    //geht jede Zeile y und jede Zahl in Zeile x durch
    chosenMotif.forEach((row, y) => {
      row.forEach((num, x) => {
        if (num === 0) return; //wenn Block 0, bleibt leer


        let el = document.createElement("a-plane"); //Erstellt einzelnen Block und gibt Klasse paintBlock
        el.setAttribute("class", "paintBlock");
        let posX = (x - row.length / 2) * blockSize; //berechnet Position des Blocks
        let posY = -(y * blockSize);
        //Setzt Position, Größe, Farbe und speichert die Farbnummer
        el.setAttribute("position", `${posX} ${posY} 0`);
        el.setAttribute("width", blockSize);
        el.setAttribute("height", blockSize);
        el.setAttribute("color", "#ffffff");
        el.setAttribute("data-number", num);
        

        // Zahl als Text über Block
        let text = document.createElement("a-text");
        text.setAttribute("value", num);
        text.setAttribute("align", "center");
        text.setAttribute("color", "black");
        text.setAttribute("position", "0 0 0.01");
        text.setAttribute("width", 2);
        el.appendChild(text);

        //Wenn Nutzer auf Block klickt und keine Farbe ausgewählt -> nichts passiert
        el.addEventListener("click", () => {
          if (!selectedColor || !selectedNumber) return;
          //Blocknummer gleicht mit gewählter Farbe, nur wenn übereinstimmen, darf bemalt werden
          let blockNum = el.getAttribute("data-number");
          if (blockNum === selectedNumber) {
            el.setAttribute("color", selectedColor); //ändert Farbe des Blocks
            //spielt Sound
            if (paintSound.components.sound) {
              paintSound.components.sound.playSound();
            }
          }
        });

        //fügt Block dem container hinzu
        blockContainer.appendChild(el);
      });
    });

    //Block container wird Szene hinzugefügt
    scene.appendChild(blockContainer);
  }

  //Farbauswahl Klick element
  document.querySelectorAll(".colorChoice").forEach(el => {
    el.addEventListener("click", () => {
      //speichert Farbe und Nummer
      selectedColor = el.getAttribute("data-color");
      selectedNumber = el.getAttribute("data-number");
      //zeigt Namen der Farbe an
      const colorName = el.getAttribute("data-name") || selectedColor;
      colorLabel.setAttribute("value", `Farbe: ${colorName}`);
    });
  });


  //altes Motiv entfernen + neues erstellen
  function loadNewMotif() {
    let oldContainer = document.getElementById("blockContainer");
    if (oldContainer) {
      oldContainer.parentNode.removeChild(oldContainer);
    }
    initBlocks();
  }

  // Szene wird sichtbar, falls vorher unsichtbar
  scene.style.display = "block";
  initBlocks();

  // Button "Neues Motiv" aktiviert -> neues Motiv geladen + Farbe zurückgesetzt
  let newMotifButton = document.getElementById("newMotifButton");
  if (newMotifButton) {
    newMotifButton.addEventListener("click", () => {
      loadNewMotif();
      selectedColor = null;
      selectedNumber = null;
      colorLabel.setAttribute("value", "Farbe: -");
    });
  }
});
