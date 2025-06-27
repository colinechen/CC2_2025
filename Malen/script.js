document.addEventListener('DOMContentLoaded', () => {
  // Warte, bis die HTML-Seite komplett geladen ist, bevor der Code startet

  // Referenzen zu wichtigen Elementen holen
  let startScreen = document.getElementById("startScreen");        // Startbildschirm-Div
  let startButton = document.getElementById("startButton");        // Start-Button
  let scene = document.querySelector("a-scene");                   // Die VR-Szene

  // Variablen für aktuell ausgewählte Farbe und Block-Nummer (anfangs leer)
  let selectedColor = null;
  let selectedNumber = null;

  // Anzeigeelement für die gewählte Farbe
  let colorLabel = document.getElementById("selectedColorLabel");

  // Audioelement für Malgeräusch
  let paintSound = document.getElementById("paintSound");

  // Farbpalette: Nummer → Farbcode
  let palette = {
    1: '#ffd1dc',    // Rosa
    2: '#a8dadc',    // Blau
    3: '#c1e1c1',    // Mint
    4: '#fff3b0',    // Gelb
    5: 'brown',      // Braun
    6: 'black'       // Schwarz
  };

  // Funktion: Neues Motiv laden (vorheriges löschen + neue Blöcke erstellen)
  function loadNewMotif() {
    let oldContainer = document.getElementById("blockContainer");
    if (oldContainer) {
      oldContainer.parentNode.removeChild(oldContainer);  // Alten Block-Container entfernen
    }
    initBlocks();  // Neue Blöcke laden
  }

  // Klick-Event für den Start-Button
  startButton.addEventListener("click", () => {
    startScreen.style.display = "none";   // Startbildschirm ausblenden
    scene.style.display = "block";        // VR-Szene sichtbar machen
    startSpeechRecognition();              // Spracherkennung starten
    initBlocks();                         // Blöcke des Motivs anzeigen
  });

  // Eventlistener für den Button "Neues Motiv"
  let newMotifButton = document.getElementById("newMotifButton");
  if (newMotifButton) {
    newMotifButton.addEventListener("click", () => {
      loadNewMotif();                     // Neues Motiv laden
      selectedColor = null;               // Farbwahl zurücksetzen
      selectedNumber = null;
      colorLabel.setAttribute("value", "Farbe: -");  // Anzeige zurücksetzen
    });
  }

  // Funktion: Spracherkennung einrichten und starten
  function startSpeechRecognition() {
    let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Spracherkennung wird von diesem Browser nicht unterstützt.");
      return;  // Abbrechen, wenn keine Unterstützung vorhanden ist
    }

    let recognition = new SpeechRecognition();
    recognition.continuous = true;        // Dauerhaft zuhören
    recognition.lang = 'de-DE';           // Sprache: Deutsch
    recognition.interimResults = false;   // Nur fertige Ergebnisse liefern

    // Wörter für Farben mit zugehörigen Nummern
    let colorWords = {
      rosa: "1",
      blau: "2",
      mint: "3",
      gelb: "4",
      braun: "5",
      schwarz: "6"
    };

    // Wenn ein Sprachergebnis erkannt wird
    recognition.onresult = function (event) {
      let transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      console.log("Gesagt:", transcript);

      // Prüfe, ob eine der Farben im gesprochenen Text vorkommt
      Object.keys(colorWords).forEach(colorName => {
        if (transcript.includes(colorName)) {
          let number = colorWords[colorName];
          selectedNumber = number;           // Farbnummer speichern
          selectedColor = palette[number];  // Farbe aus Palette holen
          // Anzeige aktualisieren (Farbe + Hinweis, dass Sprache genutzt wurde)
          colorLabel.setAttribute("value", `Farbe: ${colorName.charAt(0).toUpperCase() + colorName.slice(1)} (per Sprache)`);
          console.log("Farbe gesetzt:", selectedColor);
        }
      });
    };

    // Fehlerbehandlung der Spracherkennung
    recognition.onerror = function (event) {
      console.error("Speech error", event.error);
    };

    // Wenn Spracherkennung stoppt, direkt neu starten (für Dauerbetrieb)
    recognition.onend = function () {
      console.log("Spracherkennung gestoppt. Starte neu...");
      recognition.start();
    };

    recognition.start();  // Spracherkennung starten
  }

  // Funktion: Blöcke des Motivs erzeugen und Events setzen
  function initBlocks() {
    let keys = Object.keys(motifs);   // Alle Motivnamen holen
    let chosenKey = keys[Math.floor(Math.random() * keys.length)];  // Zufälliges Motiv auswählen
    let chosenMotif = motifs[chosenKey];  // Das Motiv (2D Array)
    let blockSize = 0.3;               // Größe der Blöcke

    let blockContainer = document.createElement("a-entity");  // Container für Blöcke
    blockContainer.setAttribute("id", "blockContainer");
    blockContainer.setAttribute("position", "0.1 1.6 -3");    // Position in der Szene

    // Für jede Zeile und Spalte im Motiv
    chosenMotif.forEach((row, y) => {
      row.forEach((num, x) => {
        if (num === 0) return;         // 0 = kein Block, überspringen

        let el = document.createElement("a-plane");   // Block als Plane
        el.setAttribute("class", "paintBlock");

        // Position berechnen, so dass Blöcke zentriert sind
        let posX = (x - row.length / 2) * blockSize;
        let posY = -(y * blockSize);
        el.setAttribute("position", `${posX} ${posY} 0`);
        el.setAttribute("width", blockSize);
        el.setAttribute("height", blockSize);
        el.setAttribute("color", "#ffffff");          // Anfangs weiß
        el.setAttribute("data-number", num);          // Nummer für Vergleich speichern
        el.setAttribute("material", "shader: flat"); // Flaches Material (kein Licht)

        // Nummer als Text auf dem Block anzeigen
        let text = document.createElement("a-text");
        text.setAttribute("value", num);
        text.setAttribute("align", "center");
        text.setAttribute("color", "black");
        text.setAttribute("position", "0 0 0.01");   // Leicht vor dem Block
        text.setAttribute("width", 2);
        el.appendChild(text);

        blockContainer.appendChild(el);               // Block zum Container hinzufügen
      });
    });

    document.querySelector("a-scene").appendChild(blockContainer); // Container zur Szene

    // Eventlistener für Farbpalette (Farbe auswählen per Klick)
    document.querySelectorAll(".colorChoice").forEach(el => {
      el.addEventListener("click", () => {
        selectedColor = el.getAttribute("data-color");     // Ausgewählte Farbe speichern
        selectedNumber = el.getAttribute("data-number");   // Passende Nummer speichern
        let colorName = el.getAttribute("data-name") || selectedColor;
        colorLabel.setAttribute("value", `Farbe: ${colorName}`);  // Anzeige aktualisieren
      });
    });

    // Eventlistener: Malen, wenn ein Block angeklickt wird
    document.addEventListener("click", e => {
      if (!e.target.classList.contains("paintBlock")) return;  // Nur reagieren, wenn Block
      if (!selectedColor || !selectedNumber) return;            // Nur wenn Farbe ausgewählt

      let blockNum = e.target.getAttribute("data-number");     // Nummer des Blocks abfragen
      if (blockNum === selectedNumber) {                        // Nur passende Nummer färben
        e.target.setAttribute("color", selectedColor);         // Block einfärben

        // Mal-Ton abspielen, falls vorhanden
        if (paintSound.components.sound) {
          paintSound.components.sound.playSound();
        }
      }
    });

  }
});
