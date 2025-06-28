document.addEventListener('DOMContentLoaded', () => {
  let startScreen = document.getElementById("startScreen");
  let startButton = document.getElementById("startButton");
  let scene = document.querySelector("a-scene");
  let colorLabel = document.getElementById("selectedColorLabel");
  let paintSound = document.getElementById("paintSound");

  let selectedColor = null;
  let selectedNumber = null;

  let hoveredColorEl = null; // Aktuell angesehene Farbe

  let palette = {
    1: '#ffd1dc',
    2: '#a8dadc',
    3: '#c1e1c1',
    4: '#fff3b0',
    5: 'brown',
    6: 'black'
  };

  function initBlocks() {
    let keys = Object.keys(motifs);
    let chosenKey = keys[Math.floor(Math.random() * keys.length)];
    let chosenMotif = motifs[chosenKey];
    let blockSize = 0.3;

    let blockContainer = document.createElement("a-entity");
    blockContainer.setAttribute("id", "blockContainer");
    blockContainer.setAttribute("position", "0.1 1.6 -3");

    chosenMotif.forEach((row, y) => {
      row.forEach((num, x) => {
        if (num === 0) return;

        let el = document.createElement("a-plane");
        el.setAttribute("class", "paintBlock");
        let posX = (x - row.length / 2) * blockSize;
        let posY = -(y * blockSize);
        el.setAttribute("position", `${posX} ${posY} 0`);
        el.setAttribute("width", blockSize);
        el.setAttribute("height", blockSize);
        el.setAttribute("color", "#ffffff");
        el.setAttribute("data-number", num);
        el.setAttribute("material", "shader: flat");

        let text = document.createElement("a-text");
        text.setAttribute("value", num);
        text.setAttribute("align", "center");
        text.setAttribute("color", "black");
        text.setAttribute("position", "0 0 0.01");
        text.setAttribute("width", 2);
        el.appendChild(text);

        blockContainer.appendChild(el);
      });
    });

    scene.appendChild(blockContainer);

    // Gaze-Ziel erfassen
    document.querySelectorAll(".colorChoice").forEach(el => {
      el.addEventListener("mouseenter", () => {
        hoveredColorEl = el;
      });
      el.addEventListener("mouseleave", () => {
        hoveredColorEl = null;
      });
    });

    // Touchstart auf die Szene: Farbe wählen, wenn Blick auf Farbfeld
    ["touchstart", "click"].forEach(evtName => {
  scene.addEventListener(evtName, () => {
    if (hoveredColorEl) {
      selectedColor = hoveredColorEl.getAttribute("data-color");
      selectedNumber = hoveredColorEl.getAttribute("data-number");
      let colorName = hoveredColorEl.getAttribute("data-name") || selectedColor;
      colorLabel.setAttribute("value", `Farbe: ${colorName}`);
    }
  });
});


    // Blöcke bemalen
    document.addEventListener("click", e => {
      if (!e.target.classList.contains("paintBlock")) return;
      if (!selectedColor || !selectedNumber) return;

      let blockNum = e.target.getAttribute("data-number");
      if (blockNum === selectedNumber) {
        e.target.setAttribute("color", selectedColor);
        if (paintSound.components.sound) {
          paintSound.components.sound.playSound();
        }
      }
    });
  }

  function loadNewMotif() {
    let oldContainer = document.getElementById("blockContainer");
    if (oldContainer) {
      oldContainer.parentNode.removeChild(oldContainer);
    }
    initBlocks();
  }

  startButton.addEventListener("click", () => {
    startScreen.style.display = "none";
    scene.style.display = "block";
    initBlocks();
  });

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
