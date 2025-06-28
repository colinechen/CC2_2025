document.addEventListener('DOMContentLoaded', () => {
  let startScreen = document.getElementById("startScreen");
  let startButton = document.getElementById("startButton");
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

  let currentLookedAtColorEl = null; // Farbpalette-Element, das gerade angeschaut wird

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

        // Blöcke werden durch Fuse (Gaze + Timeout) automatisch per click angemalt
        el.addEventListener("click", () => {
          if (!selectedColor || !selectedNumber) return;

          let blockNum = el.getAttribute("data-number");
          if (blockNum === selectedNumber) {
            el.setAttribute("color", selectedColor);
            if (paintSound.components.sound) {
              paintSound.components.sound.playSound();
            }
          }
        });

        blockContainer.appendChild(el);
      });
    });

    scene.appendChild(blockContainer);

    // Farbpalette - nur merken welches Element angeschaut wird (kein Farbwechsel hier)
    document.querySelectorAll(".colorChoice").forEach(el => {
      el.addEventListener("mouseenter", () => {
        currentLookedAtColorEl = el;
        el.setAttribute("scale", "1.2 1.2 1"); // Optional: Hervorhebung
      });
      el.addEventListener("mouseleave", () => {
        if (currentLookedAtColorEl === el) {
          currentLookedAtColorEl = null;
        }
        el.setAttribute("scale", "1 1 1");
      });
    });
  }

  // Klick auf Szene = Farbwahl nur, wenn Farbpalette angeschaut wird
  scene.addEventListener("click", (evt) => {
    const cursor = evt.detail.cursorEl;
    if (!cursor) return;

    // Nur echten Controller-Klick zulassen, nicht Fuse-automatisch
    if (cursor.components.cursor && cursor.components.cursor.fusing) {
      // Automatischer Fuse-Click, ignorieren
      return;
    }

    if (currentLookedAtColorEl) {
      selectedColor = currentLookedAtColorEl.getAttribute("data-color");
      selectedNumber = currentLookedAtColorEl.getAttribute("data-number");
      let colorName = currentLookedAtColorEl.getAttribute("data-name") || selectedColor;
      colorLabel.setAttribute("value", `Farbe: ${colorName}`);
    }
  });

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
