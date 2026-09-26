# IVPITER — memoria di progetto

Bot Discord della community italiana di Valorant **IVPITER**. Questo file lo legge
Claude Code da solo all'avvio di ogni sessione in questo repo: contiene quello che
serve per lavorarci senza ricostruire il contesto ogni volta.

Autore e referente: **Fusco** (Discord `calmiamoci`). Il codice è proprietario:
ogni file porta la firma in testa, non va rimossa.

## Lingua

**Si parla e si scrive in italiano**: risposte in chat, commenti nel codice,
messaggi di commit, testi dei pannelli, log. Tutta l'utenza del bot è italiana.

## Stack e comandi

- Node.js + **discord.js v14** (CommonJS, niente TypeScript, niente build step)
- **better-sqlite3** in WAL: query sincrone con prepared statement, scritture
  multiple dentro `db.transaction()`
- Express solo per i webhook Faceit e l'API pubblica di sola lettura

```bash
npm start                  # avvia il bot
npm run dev                # avvio con --watch
npm run deploy-commands    # registra i comandi slash sulla guild
npm run diagnose-social    # diagnostica dei feed RSS
npm run prova-rank         # prova il servizio di lettura del rank
```

`npm run deploy-commands` va rilanciato **ogni volta** che cambia la definizione
di un comando slash (nome, descrizione, opzioni). Se non lo si fa, su Discord
restano i comandi vecchi.

## Struttura

```
config/     un file per funzione (ihl, rank, ruoli, hub, ipl, streamer, social, …)
            → i testi dei pannelli e gli ID stanno QUI, non nel codice
src/
  commands/   un file per comando slash
  events/     un file per evento Discord (ready, interactionCreate, voiceStateUpdate, …)
  modules/
    ihl/      In-House League: code, draft, ban mappe, voto, classifica, leghe
    rank/     verifica rank, ruoli di gioco, accesso IPL, insegne, stato vocale
    tickets/  pratiche (apertura, chiusura, transcript)
    social/   notifiche RSS · twitch/ · memberLog/ · welcome/ · faceit/ · api/
  database/   db.js (schema + migrazioni) e repositories/ (una per tabella)
  utils/      cards.js (Components V2), embeds.js, emoji.js, attachments.js, logger.js
docs/       INTEGRAZIONE-SITO.md (API per il sito), PASSAGGIO-DI-CONSEGNE.md (il concept)
```

## Convenzioni da rispettare

**Testi e ID sempre in `config/`.** Il codice li legge, non li contiene. Chi
gestisce il server deve poter cambiare una frase senza toccare la logica.

**Pannelli in Components V2.** Si costruiscono con `buildCard()` di
`src/utils/cards.js`: il banner sta in cima, e nello stesso messaggio non possono
convivere `content` o `embeds` con il flag `IsComponentsV2`.

**Un pannello si aggiorna, non si duplica.** Ogni comando che pubblica una scheda
salva `canale:messaggio` in `settings` e al rilancio la modifica. Senza una nuova
immagine il banner esistente va riallegato: il riferimento `attachment://` vale
solo per i file inviati nella stessa chiamata.

**Concorrenza.** Dieci persone premono lo stesso bottone nello stesso secondo:
il cambio di stato va fatto **prima** di qualunque `await`, le schede si
ripubblicano dentro il lock per lobby (`withLock`) e lo stato si rilegge sempre
dal database (`fresh()`), mai dallo snapshot ricevuto.

**Commenti.** Poche righe, in italiano, sul *perché* — soprattutto dove c'è un
limite di Discord o una race condition. Niente commenti che ripetono il codice.

**Test.** Script Node autonomi nella scratchpad, con oggetti Discord finti; ogni
correzione di un bug si verifica anche **all'incontrario**, controllando che il
test fallisca sul codice di prima (`git stash`). Non c'è un test runner nel repo.

## Limiti di Discord già sbattuti in faccia

- **2 rinomine di canale ogni 10 minuti**: oltre, la richiesta resta in coda e
  blocca l'`await`. Le rinomine vanno lanciate senza aspettarle.
- **Le emoji personalizzate non si vedono nei nomi dei canali.** Per mostrare i
  rank di chi è in vocale si usa lo **stato del canale vocale**
  (`Routes.channelVoiceStatus`, PUT), che le accetta e non ha quel limite.
- **Le opzioni obbligatorie devono precedere le facoltative**, altrimenti Discord
  rifiuta l'intera registrazione e restano i comandi vecchi. `deploy-commands.js`
  lo controlla prima di inviare.
- I bottoni hanno **5 stili fissi** (nessun nero) e nessun controllo sulla
  dimensione. Un'interazione va confermata entro **3 secondi**.
- Un'emoji non valida fa rifiutare tutto il messaggio: si passa da
  `toButtonEmoji()`, che in caso di dubbio lascia la voce senza icona.

## Deploy

VPS Contabo, utente **`botuser`**, cartella `~/botds`, processo PM2
**`valorant-bot`** (non "ivpiter"). PM2 è per utente: da root serve
`su - botuser -c "pm2 list"`.

```bash
cd ~/botds && git pull && npm run deploy-commands && pm2 restart valorant-bot
```

`npm run deploy-commands` serve solo se sono cambiati i comandi slash. Dopo un
cambio nei testi dei pannelli va rilanciato il comando che li pubblica.

## Segreti

Token Discord, `HENRIK_API_KEY`, chiavi Faceit e Twitch vivono **solo** nel `.env`
sulla VPS (`.env` è in `.gitignore`). Non vanno mai scritti nel repo, nei commit,
nei messaggi di pull request o nei log. `.env.example` elenca le variabili senza
valori.

## Git

Si lavora sul branch **`claude/discord-valorant-faceit-bot-7pstrr`**. Commit in
italiano, una riga di titolo che dice cosa cambia per chi usa il bot, poi il
perché. Nessuna pull request se non viene chiesta.

## Il resto del contesto

`docs/PASSAGGIO-DI-CONSEGNE.md` racconta il concept, com'è fatto ogni pezzo, la
lista completa dei comandi, gli ID in uso e cosa resta da fare.
