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
│   ├── commands/                 # comandi slash (ticket, embed, setup, link, twitch, inviti, leaderboard)
│   ├── events/                   # eventi Discord.js (ready, interactionCreate)
│   ├── database/
│   │   ├── db.js                 # connessione better-sqlite3 + schema
│   │   └── repositories/         # query per users, tickets, match, settings
│   ├── modules/
│   │   ├── tickets/               # sistema ticket (creazione, transcript, ping DM)
│   │   ├── memberLog/             # log ingressi/uscite + tracking inviti
│   │   ├── twitch/                # notifiche live (polling API Helix)
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

1. **Ticket** — `/ticket-panel` pubblica il pannello (con banner opzionale, titolo e testo personalizzabili dal comando stesso) con un bottone per ogni tipo di ticket definito in `config/tickets.config.js`. Ogni tipo può avere categoria e ruolo staff dedicati, e istruzioni proprie mostrate all'apertura; un utente può avere una pratica aperta per tipo. Il canale creato include i bottoni "Chiudi e Cancella", "Salva Transcript" e "Ping Utente in DM".
2. **Setup messaggi** — `/setup-channels` (admin) popola/aggiorna i canali definiti in `config/channels.config.js` con embed curati (titolo, testo, campi, banner/thumbnail). Può essere eseguito più volte: se un messaggio esiste già lo edita invece di duplicarlo.
4. **Faceit Hub** — `/link <faceit_name>` collega l'account; il server Express (`FACEIT_WEBHOOK_PORT`) riceve i webhook Faceit su `POST /webhooks/faceit`, smista i team in due canali vocali temporanei e li elimina a fine match.
5. **Leaderboard** — `/leaderboard-setup` inizializza l'embed persistente; viene aggiornato automaticamente (`message.edit`) a ogni match concluso.
6. **Ruolo automatico** — impostando `AUTOROLE_ID` nel `.env`, il bot assegna automaticamente quel ruolo a ogni nuovo membro che entra nel server (il ruolo del bot deve stare più in alto di quel ruolo nella lista ruoli del server).
7. **Notifiche live Twitch** — il bot controlla periodicamente (`TWITCH_POLL_SECONDS`, default 120s) gli streamer registrati con `/twitch aggiungi` e pubblica in `TWITCH_ANNOUNCE_CHANNEL_ID` un embed con titolo, gioco, spettatori, anteprima e bottone "Guarda la live", menzionando quanto impostato in `TWITCH_MENTION` (`everyone`, `here`, un ID ruolo o `nessuna`). L'annuncio è legato all'ID della diretta, quindi un riavvio del bot non genera doppioni. Sottocomandi: `aggiungi`, `rimuovi`, `lista`, `prova`.
8. **Log membri e tracking inviti** — con `MEMBER_JOIN_CHANNEL_ID` e `MEMBER_LEAVE_CHANNEL_ID` impostati (oppure il solo `MEMBER_LOG_CHANNEL_ID` per usare un unico canale), ogni ingresso pubblica un embed con utente, ID, data di creazione dell'account (con avviso se ha meno di 7 giorni), invito usato, chi ha invitato e suo totale inviti, e membri totali. Ogni uscita pubblica data di ingresso, permanenza, chi lo aveva invitato e ruoli che aveva. `/inviti` mostra la classifica di chi invita più membri (o i dati di un singolo utente). Richiede il permesso **Gestisci server** per leggere gli inviti.

## In-House League

`/ihl pannello` pubblica il pannello rosso/verde con cui lo staff apre e chiude le code. Alla decima persona in coda nasce una **stanza privata della partita** (`partita-<id>`, categoria in `config/ihl.config.js`): lì dentro si svolge tutto — check-in, coinflip, scelta del lato, ban delle mappe, draft e voto del vincitore — mentre il canale delle code resta libero e la coda successiva riparte subito.

Prima che la partita inizi viene creato un **vocale di ritrovo**: chi è già collegato a un vocale qualsiasi ci viene spostato dal bot, gli altri entrano da soli. Le scelte partono solo quando ci sono dentro tutti e dieci, e da lì i giocatori vengono spostati nelle vocali delle due squadre. Chi non si presenta può essere sostituito dallo staff con `/ihl sostituisci` dopo i minuti indicati da `timers.substituteAfter`. Chi è già in una partita non conclusa non può rimettersi in coda.

I capitani sono i due ELO più alti, ma **chi apre le scelte lo decide un sorteggio**. Il voto del vincitore non ha scadenza: l'ELO viene assegnato appena una squadra raggiunge la maggioranza dei voti. Altri comandi: `/ihl profilo`, `/ihl classifica`, `/ihl partite`, `/ihl risultato`, `/ihl elo-modifica`, `/ihl annulla`.

## Messaggi grafici senza toccare il codice

- **`/embed`** — crea un messaggio impaginato direttamente da Discord: nel comando scegli canale, carichi l'immagine banner, la thumbnail e il colore; si apre un popup dove scrivi titolo, testo (multilinea, con markdown) e le sezioni, una per riga nel formato `Titolo | Testo` (aggiungi `| inline` per affiancarle). Le immagini caricate vengono ri-allegate al messaggio, quindi non scadono. Alla fine ricevi l'ID del messaggio.
- **`/embed-modifica`** — passi l'ID del messaggio e riapre lo stesso popup **già precompilato** col contenuto attuale: cambi quello che vuoi e il messaggio viene aggiornato sul posto (opzionalmente con nuova immagine/colore).

Alternativa per i messaggi fissi di setup: il contenuto di `/setup-channels` si edita in `config/channels.config.js` (titolo, descrizione, campi, colore, `image`, `thumbnail`), poi serve `pm2 restart` e rieseguire il comando — se il messaggio esiste già viene aggiornato, non duplicato.

## Webhook Faceit

Configura nella Faceit Hub l'URL `https://<tuo-host>:<FACEIT_WEBHOOK_PORT>/webhooks/faceit`. Se imposti `FACEIT_WEBHOOK_SECRET`, il bot richiede l'header `x-webhook-secret` (o `?secret=`) corrispondente per accettare la richiesta.

## Regolamento HUB e ruolo IPL

`/regolamento-hub` pubblica il regolamento delle HUB (testo in `config/hub.config.js`) con banner opzionale e un bottone che apre un ticket del tipo `ipl`, dove lo staff chiede link del tracker o nome Riot. Quel tipo di ticket è marcato `hidden` in `config/tickets.config.js`, quindi non compare nel pannello generale `/ticket-panel`: la richiesta parte solo dopo aver letto le regole.

## API per il sito

Sulla stessa porta dei webhook gira un'API di sola lettura che espone classifica, profili e storico partite della In-House League, sempre allineata a quanto si vede su Discord: `GET /api/v1/leaderboard`, `/api/v1/players/:discordId`, `/api/v1/matches`, `/api/v1/health`.

La documentazione completa da consegnare a chi sviluppa il sito è in [`docs/INTEGRAZIONE-SITO.md`](docs/INTEGRAZIONE-SITO.md): endpoint, esempi di risposta, schema del database, funzionamento dell'ELO e configurazione del reverse proxy.
