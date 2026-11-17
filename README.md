# Jahrgang – Das Musik-Partyspiel

Songs hören und in der eigenen Zeitleiste ins richtige Jahr einsortieren. Wer zuerst die Ziel-Anzahl Karten hat, gewinnt.

## Als App auf dem iPhone

1. In Safari öffnen: **https://regi69.github.io/jahrgang-app/**
2. Unten auf **Teilen** (Quadrat mit Pfeil) tippen.
3. **Zum Home-Bildschirm** wählen und **Hinzufügen** tippen.

Danach startet «Jahrgang» wie eine App: mit eigenem Icon, im Vollbild und ohne Safari-Leiste. Das Spiel selbst läuft auch offline. Für die 30-Sekunden-Song-Vorschauen braucht es Internet. Ohne Internet übernimmt eine Person den DJ und spielt den Song über Spotify oder YouTube ab.

## Veröffentlichung

Dieses Repo enthält nur das Spiel und wird über GitHub Pages veröffentlicht.

## Dateien

- `index.html` – das ganze Spiel (Songliste, Regeln, Darstellung)
- `manifest.webmanifest`, `sw.js` – machen die Seite installierbar und offline-fähig
- `icons/` – App-Icons; neu erzeugen mit `python3 icons/generate_icon.py`

Bei Änderungen an der App in `sw.js` die `VERSION` erhöhen, damit installierte Apps die neue Version laden.
