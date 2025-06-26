document.querySelector('a-scene').addEventListener('loaded', () => {
  
let selectedColor = null;
let selectedNumber = null;
const colorLabel = document.getElementById("selectedColorLabel");
const paintSound = document.getElementById("paintSound");


const palette = {
  1: '#ffd1dc',
  2: '#a8dadc',
  3: '#c1e1c1',
  4: '#fff3b0',
  5: 'brown',
};

// Sprachsteuerung aktivieren
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.lang = 'de-DE';
  recognition.interimResults = false;

  const colorWords = {
    rosa: "1",
    blau: "2",
    grün: "3",
    gelb: "4",
    braun: "5"
  };

  recognition.onresult = function(event) {
    const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    console.log("Gesagt:", transcript);

    Object.keys(colorWords).forEach(colorName => {
      if (transcript.includes(colorName)) {
        const number = colorWords[colorName];
        selectedNumber = number;
        selectedColor = palette[number];
        colorLabel.setAttribute("value", `Farbe: ${colorName.charAt(0).toUpperCase() + colorName.slice(1)} (per Sprache)`);
        console.log("Farbe gesetzt:", selectedColor);
      }
    });
  };

  recognition.onerror = function(event) {
    console.error("Speech error", event.error);
  };

  recognition.start();
} else {
  console.warn("Spracherkennung wird von diesem Browser nicht unterstützt.");
}


// Zufälliges Motiv auswählen
const keys = Object.keys(motifs);
const chosenKey = keys[Math.floor(Math.random() * keys.length)];
const chosenMotif = motifs[chosenKey];

// Blöcke rendern
const blockSize = 0.3;

// Container erstellen, der die Blöcke gemeinsam hält
const blockContainer = document.createElement("a-entity");
blockContainer.setAttribute("id", "blockContainer");
blockContainer.setAttribute("position", `0.1 1.6 -3`); // Höhe und Entfernung zur Palette anpassen

// Blöcke im Container erzeugen
chosenMotif.forEach((row, y) => {
  row.forEach((num, x) => {
    if (num === 0) return;

    const el = document.createElement("a-plane");
    el.setAttribute("class", "paintBlock");

    const posX = (x - row.length / 2) * blockSize;
    const posY = -(y * blockSize);
    el.setAttribute("position", `${posX} ${posY} 0`);
    el.setAttribute("width", blockSize);
    el.setAttribute("height", blockSize);
    el.setAttribute("color", "#ffffff");
    el.setAttribute("data-number", num);
    el.setAttribute("material", "shader: flat");

    const text = document.createElement("a-text");
    text.setAttribute("value", num);
    text.setAttribute("align", "center");
    text.setAttribute("color", "black");
    text.setAttribute("position", "0 0 0.01");
    text.setAttribute("width", 2);
    el.appendChild(text);

    blockContainer.appendChild(el);
  });
});

// Container zur Szene hinzufügen
document.querySelector("a-scene").appendChild(blockContainer);

// Farbwahl
document.querySelectorAll(".colorChoice").forEach(el => {
  el.addEventListener("click", () => {
    selectedColor = el.getAttribute("data-color");
    selectedNumber = el.getAttribute("data-number");
    const colorName = el.getAttribute("data-name") || selectedColor;
    colorLabel.setAttribute("value", `Farbe: ${colorName}`);
  });
});

// Anmalen durch Blick
document.addEventListener("click", e => {
  if (!e.target.classList.contains("paintBlock")) return;
  if (!selectedColor || !selectedNumber) return;

  const blockNum = e.target.getAttribute("data-number");
  if (blockNum === selectedNumber) {
    e.target.setAttribute("color", selectedColor);
  if (paintSound.components.sound) {
  paintSound.components.sound.playSound();
}

  }
});


document.getElementById("resetButton").addEventListener("click", () => {
  // Alle Blöcke auf Weiß zurücksetzen
  document.querySelectorAll(".paintBlock").forEach(block => {
    block.setAttribute("color", "#ffffff");
  });

  // Farbe zurücksetzen
  selectedColor = null;
  selectedNumber = null;
  colorLabel.setAttribute("value", "Farbe: -");
});

});
