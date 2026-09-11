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
7. **Log membri e tracking inviti** — con `MEMBER_JOIN_CHANNEL_ID` e `MEMBER_LEAVE_CHANNEL_ID` impostati (oppure il solo `MEMBER_LOG_CHANNEL_ID` per usare un unico canale), ogni ingresso pubblica un embed con utente, ID, data di creazione dell'account (con avviso se ha meno di 7 giorni), invito usato, chi ha invitato e suo totale inviti, e membri totali. Ogni uscita pubblica data di ingresso, permanenza, chi lo aveva invitato e ruoli che aveva. `/inviti` mostra la classifica di chi invita più membri (o i dati di un singolo utente). Richiede il permesso **Gestisci server** per leggere gli inviti.

## Messaggi grafici senza toccare il codice

- **`/embed`** — crea un messaggio impaginato direttamente da Discord: nel comando scegli canale, carichi l'immagine banner, la thumbnail e il colore; si apre un popup dove scrivi titolo, testo (multilinea, con markdown) e le sezioni, una per riga nel formato `Titolo | Testo` (aggiungi `| inline` per affiancarle). Le immagini caricate vengono ri-allegate al messaggio, quindi non scadono. Alla fine ricevi l'ID del messaggio.
- **`/embed-modifica`** — passi l'ID del messaggio e riapre lo stesso popup **già precompilato** col contenuto attuale: cambi quello che vuoi e il messaggio viene aggiornato sul posto (opzionalmente con nuova immagine/colore).

Alternativa per i messaggi fissi di setup: il contenuto di `/setup-channels` si edita in `config/channels.config.js` (titolo, descrizione, campi, colore, `image`, `thumbnail`), poi serve `pm2 restart` e rieseguire il comando — se il messaggio esiste già viene aggiornato, non duplicato.

## Webhook Faceit

Configura nella Faceit Hub l'URL `https://<tuo-host>:<FACEIT_WEBHOOK_PORT>/webhooks/faceit`. Se imposti `FACEIT_WEBHOOK_SECRET`, il bot richiede l'header `x-webhook-secret` (o `?secret=`) corrispondente per accettare la richiesta.
