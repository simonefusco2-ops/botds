# Valorant Team & Faceit Hub Bot

Bot Discord modulare (Discord.js v14) per la gestione di un team Valorant e l'automazione della Faceit Hub (In-House League).

## Struttura del progetto

```
botds/
├── config/
│   └── channels.config.js        # embed per /setup-channels
├── data/                          # database SQLite (creato a runtime)
├── src/
│   ├── index.js                  # entry point: client Discord + server webhook Faceit
│   ├── deploy-commands.js        # registrazione comandi slash
│   ├── config.js                 # caricamento/validazione env
│   ├── commands/                 # comandi slash (ticket, setup, link, musica, leaderboard)
│   ├── events/                   # eventi Discord.js (ready, interactionCreate)
│   ├── database/
│   │   ├── db.js                 # connessione better-sqlite3 + schema
│   │   └── repositories/         # query per users, tickets, match, settings
│   ├── modules/
│   │   ├── tickets/               # sistema ticket (creazione, transcript, ping DM)
│   │   ├── music/                 # player (discord-player) + eventi
│   │   ├── faceit/                # webhook server Express + routing vocale
│   │   └── leaderboard/           # classifica persistente
│   └── utils/                    # embed builder, logger
└── .env.example
```

## Installazione

```bash
npm install
cp .env.example .env   # compila le variabili (token, ID canali/ruoli, ecc.)
npm run deploy-commands # registra gli slash command sulla guild
npm start
```

## Moduli

1. **Ticket** — `/ticket-panel` pubblica il bottone di apertura; il canale creato include i bottoni "Chiudi e Cancella", "Salva Transcript" e "Ping Utente in DM".
2. **Setup messaggi** — `/setup-channels` (admin) popola/aggiorna i canali definiti in `config/channels.config.js` con embed curati (titolo, testo, campi, banner/thumbnail). Può essere eseguito più volte: se un messaggio esiste già lo edita invece di duplicarlo.
3. **Audio** — `/play`, `/skip`, `/stop`, `/queue` tramite `discord-player` (YouTube + Spotify, playlist incluse); ogni brano avviato pubblica un embed "Ora in riproduzione" con copertina/thumbnail.
4. **Faceit Hub** — `/link <faceit_name>` collega l'account; il server Express (`FACEIT_WEBHOOK_PORT`) riceve i webhook Faceit su `POST /webhooks/faceit`, smista i team in due canali vocali temporanei e li elimina a fine match.
5. **Leaderboard** — `/leaderboard-setup` inizializza l'embed persistente; viene aggiornato automaticamente (`message.edit`) a ogni match concluso.
6. **Ruolo automatico** — impostando `AUTOROLE_ID` nel `.env`, il bot assegna automaticamente quel ruolo a ogni nuovo membro che entra nel server (il ruolo del bot deve stare più in alto di quel ruolo nella lista ruoli del server).

## Personalizzare i messaggi (banner, testo, ecc.)

Tutto il contenuto di `/setup-channels` si edita in `config/channels.config.js`: titolo, descrizione, campi, colore, `image` (banner grande) e `thumbnail` (icona piccola). Per ottenere l'URL di un'immagine: caricala in un canale Discord qualsiasi, tasto destro sull'immagine inviata → **Copia link** → incollalo nel campo `image`/`thumbnail`. Dopo aver modificato il file serve riavviare il processo (`pm2 restart valorant-bot`) e rieseguire `/setup-channels` su Discord: se il messaggio esiste già viene aggiornato, non duplicato.

## Webhook Faceit

Configura nella Faceit Hub l'URL `https://<tuo-host>:<FACEIT_WEBHOOK_PORT>/webhooks/faceit`. Se imposti `FACEIT_WEBHOOK_SECRET`, il bot richiede l'header `x-webhook-secret` (o `?secret=`) corrispondente per accettare la richiesta.
