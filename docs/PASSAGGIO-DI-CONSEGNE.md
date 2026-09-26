# IVPITER — passaggio di consegne

Documento per chi prende in mano il progetto: un altro account Claude, un altro
sviluppatore, o me stesso fra tre mesi. Racconta **cos'è il bot**, **com'è fatto**
e **cosa resta da fare**, così da poterci lavorare senza la cronologia delle chat.

Ultimo aggiornamento: settembre 2026.

---

## 1. Il concept

**IVPITER** è una community italiana di Valorant. Il bot (`valorant-bot`) fa tre
cose, in ordine di importanza:

1. **Manda le IPL, la In-House League.** Dieci persone entrano in coda da un
   pannello, il bot forma la partita e la porta avanti da solo fino al risultato:
   check-in in vocale, coinflip, scelta del lato, draft dei giocatori, ban delle
   mappe, voto del vincitore, ELO aggiornato, classifica riscritta.
2. **Smista le persone.** Verifica il rank Valorant dal link tracker.gg, assegna
   il ruolo del rank, raccoglie i ruoli di gioco (Duelist, Initiator, Controller,
   Sentinel) e dà l'accesso alle IPL quando i requisiti sono entrambi soddisfatti.
3. **Tiene vivo il server.** Benvenuto, regolamenti, pannelli, notifiche Twitch e
   social, pratiche (ticket), log ingressi e inviti.

Due leghe separate, con code, classifiche ed ELO indipendenti:

| Lega | Chi entra | Ruolo di accesso |
| --- | --- | --- |
| **LEGA PRO** | da Immortale 1 in su | `1553355794320326736` |
| **LEGA OPEN** | fino ad Ascendente 3 | `1553024176129048656` |

---

## 2. Come funziona una partita IPL

```
CODA          il pannello apre le code; 10 posti, un giocatore per una sola partita
  ↓           (al decimo il bot crea subito la coda successiva)
CHECK-IN      canale testuale privato della partita + stanza vocale di check-in;
              ognuno riceve un DM con il bottone per entrare nel check-in;
              chi è già in vocale viene trascinato dentro. Dopo 7 minuti lo staff
              può sostituire chi non si presenta (/ihl sostituisci)
COINFLIP      decide chi dei due capitani scegli per primo (non l'ELO)
LATO          il capitano scelto prende attacco o difesa
DRAFT         i capitani si alternano scegliendo i giocatori; accanto a ogni nome
              compaiono le emoji del rank e dei ruoli di gioco
BAN MAPPE     dopo il draft, a turno, su tutte le 7 mappe attive
LIVE          due stanze vocali, squadre spostate dentro
VOTO          i 10 votano il vincitore nel canale della partita: **prima squadra a
              6 voti**, nessuna scadenza (le partite possono durare ore)
CHIUSURA      ELO aggiornato, classifica riscritta, canali cancellati
```

Ogni fase vive **dentro il canale della partita**. Il canale delle code resta
pulito: solo il pannello e la scheda della coda. Avvii, risultati e annullamenti
finiscono nel canale storico `1553153529361989683`. La stanza testuale della
partita la vedono solo i dieci e lo staff. Le vocali (check-in e squadre) le vedono
tutti, così il server sembra popolato, ma ci entra solo chi gioca: nelle vocali
delle squadre solo quella squadra. Nascono in fondo alla categoria
`1547745773452533814`.

---

## 3. Come si entra nelle IPL

Due requisiti, entrambi obbligatori. È il punto che la gente sbaglia più spesso,
quindi il bot lo ripete in tre posti: nel pannello, nella risposta a ogni clic e
in DM.

1. **Ruolo di gioco** — bottoni nel pannello `/pannello-ruoli`, canale
   `1553343914960883802`. Se ne possono prendere più di uno.
2. **Rank verificato** — si incolla il link del profilo tracker.gg. Sotto
   **Ascendente** il bot assegna subito; da Ascendente in su apre una pratica e
   decide lo staff (approvando, la pratica si chiude da sola e parte il DM).

Quando ci sono entrambi, il ruolo IPL arriva da solo (`src/modules/rank/iplAccess.js`).
Vale anche al contrario: chi si toglie il ruolo di gioco perde l'accesso, e chi
sale a Immortale passa da OPEN a PRO.

**Un limite da sapere:** il link tracker.gg **non prova** che l'account sia suo,
chiunque può incollare quello di un altro. La lettura automatica è un aiuto per lo
staff, non una verifica d'identità. L'unica prova vera sarebbe **Riot RSO**, che
richiede l'approvazione di Riot. Per questo dopo Ascendente decide una persona.

---

## 4. I comandi

Tutti riservati allo staff se non indicato. Quelli che pubblicano un pannello
accettano `canale` e `immagine` (banner) e al rilancio **aggiornano** la scheda.

**In-House League**
| Comando | Cosa fa |
| --- | --- |
| `/ihl pannello lega:<pro\|open>` | pubblica il pannello delle code di quella lega |
| `/ihl classifica lega:<…>` | pubblica la classifica persistente |
| `/ihl profilo [giocatore]` | ELO, partite, vittorie (aperto a tutti) |
| `/ihl elo-modifica` | correzione manuale dell'ELO |
| `/ihl partite` | le partite in corso |
| `/ihl risultato codice squadra` | forza il vincitore |
| `/ihl sostituisci codice esce entra` | cambio giocatore dopo i 7 minuti |
| `/ihl sblocca [codice]` | rimette in pari una partita bloccata (scheda, timer, vocali) senza annullarla |
| `/ihl annulla [codice]` | annulla una lobby |

**Pannelli e regolamenti**
`/pannello-ruoli` · `/pannello-ipl` · `/regolamento-hub` · `/regolamento-streamer`
· `/regolamento` · `/benvenuto` · `/ticket-panel` · `/roster divisione:<…>` ·
`/setup-channels`

**Notifiche e utilità**
`/twitch aggiungi|rimuovi|lista|prova` · `/social pannello|aggiungi|rimuovi|lista|controlla|prova`
· `/inviti [utente]` · `/embed` · `/embed-modifica`

---

## 5. Gli ID in uso

| Cosa | ID | Dove |
| --- | --- | --- |
| Canale ruoli e rank | `1553343914960883802` | `config/ruoli.config.js` |
| Storico partite | `1553153529361989683` | `config/ihl.config.js` |
| Categoria stanze IHL | `1547745773452533814` | `config/ihl.config.js` |
| IPL PRO / IPL OPEN | `1553355794320326736` / `1553024176129048656` | `config/rank.config.js` |
| Nove ruoli dei rank | da Ferro a Radiante | `config/rank.config.js` |
| Quattro ruoli di gioco | Duelist, Initiator, Controller, Sentinel | `config/ruoli.config.js` |
| Separatori community / rank / ruoli | `1553405950826778684` / `1553403291013218425` / `1553351503027376210` | `config/separatori.config.js` |

Gli altri (staff, categorie ticket, canali di log) stanno nel `.env` sulla VPS;
`.env.example` elenca le variabili.

---

## 6. Il sito

`docs/INTEGRAZIONE-SITO.md` descrive l'API di sola lettura che alimenta la
classifica sul sito: `/api/v1/health`, `/leaderboard`, `/players/:id`, `/matches`,
con `?lega=pro|open`, token opzionale, CORS e rate limit. Gira sul server HTTP del
bot, porta `API_PORT` (default 3000).

---

## 7. Cosa resta da fare

**Da fare sulla VPS (non è codice)**
- [ ] `HENRIK_API_KEY` nel `.env` — e **rigenerare la chiave**, è già passata in chat
- [ ] `npm run prova-rank` per validare la lettura del rank dalla VPS
- [ ] il ruolo del bot va **sopra** i ruoli dei rank, quelli IPL e i separatori, o non li assegna
- [ ] ID del **separatore staff** in `config/separatori.config.js` (`staff.roleId`)
- [ ] permesso **«Imposta stato canale vocale»** per i rank in vocale
- [ ] ripubblicare i pannelli delle due leghe e le classifiche
- [ ] tolto il modulo Faceit: `npm run deploy-commands` (sparisce `/link`) e
      ripubblicare `/ticket-panel` (il ticket «Faceit Hub» ora è «Partite IPL»)
- [ ] feed RSS dei social (X, Instagram, TikTok non hanno API di lettura gratuite:
      si passa da un bridge RSS)

**Aperto sul codice**
- [ ] Riot RSO per la verifica vera dell'identità, se Riot approva la richiesta
- [ ] il `README.md` descrive ancora in parte la fase iniziale del progetto:
      questo documento e `CLAUDE.md` sono la fonte aggiornata

---

## 8. Se prendi in mano il progetto adesso

1. Chiedi l'accesso al repo `simonefusco2-ops/botds` e lavora sul branch
   `claude/discord-valorant-faceit-bot-7pstrr`.
2. Leggi `CLAUDE.md`: convenzioni, limiti di Discord già scoperti, comandi, deploy.
3. Per provare qualcosa in locale serve un tuo `.env` (parti da `.env.example`) e
   un bot Discord tuo su un server di prova: i test veri si fanno con script Node
   autonomi e oggetti Discord finti, senza toccare la produzione.
4. Non mettere mai chiavi nel repo.
