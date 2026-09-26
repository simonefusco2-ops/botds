# IVPITER — Integrazione con il sito

Documento per chi sviluppa **ivpiter.it**: come leggere in tempo reale la
classifica della In-House League, i profili dei giocatori e lo storico delle
partite gestite dal bot Discord.

> Autore del bot: Fusco — Discord `calmiamoci`.

---

## 1. In breve

Il bot Discord è anche un piccolo server HTTP. Espone un'**API di sola lettura**
che legge direttamente il suo database: quello che il sito riceve è sempre
identico a quello che i giocatori vedono su Discord, **senza esportazioni
manuali e senza ritardi** — l'ELO viene scritto nel database nel momento in cui
una partita si chiude, e la chiamata successiva lo vede già.

Non serve accesso al database, né a Discord, né al codice: bastano delle GET.

---

## 2. Come è fatto il bot

| | |
|---|---|
| Linguaggio | Node.js 20+, CommonJS |
| Libreria Discord | discord.js v14 |
| Database | SQLite tramite `better-sqlite3`, file `data/bot.db`, modalità WAL |
| Server HTTP | Express (stesso processo del bot) |
| Processo | PM2, nome `valorant-bot`, sulla VPS in `/home/botuser/botds` |

Il bot è modulare: ogni funzione sta in `src/modules/<nome>/`. Quella che
interessa al sito è `src/modules/ihl/` (In-House League) e la sua API in
`src/modules/api/publicApi.js`. Gli accessi al database passano tutti dai
"repository" in `src/database/repositories/`, non ci sono query sparse nel
codice.

**Perché SQLite.** Il carico è una manciata di scritture per partita e qualche
lettura: un database su file basta e avanza, non richiede un servizio a parte e
il backup è la copia di un file. Le scritture sono sincrone e transazionali,
quindi non esistono stati intermedi visibili all'API.

---

## 3. Le due leghe

Il sistema ospita **due campionati indipendenti**: `pro` e `open`. Hanno ELO,
classifica e storico separati, e lo stesso giocatore può avere due punteggi
diversi. **Ogni endpoint accetta il parametro `lega`** (`?lega=pro`, `?lega=open`);
omettendolo si ottiene la prima lega, cioè `pro`.

`GET /health` elenca le leghe esistenti con quanti giocatori ha ciascuna: è da lì
che il sito può ricavarle senza averle scritte a mano.

Nel database la colonna `league` distingue le righe in `ihl_players`,
`ihl_matches` e `ihl_lobbies`. Le partite giocate prima dell'introduzione delle
leghe sono marcate `archivio` e non appartengono a nessuna delle due.

## 4. Come funziona la classifica

- Ogni giocatore parte da **1000 ELO** alla prima coda.
- A fine partita si applica un **Elo classico**: si confronta la media ELO delle
  due squadre, con **K = 32**. Chi batte una squadra più forte guadagna di più.
- Il punteggio **non scende mai sotto 100**.
- Ogni partita ha un **codice numerico** (`match_id`). Lo staff può annullarla:
  in quel caso a tutti i dieci giocatori viene **restituito esattamente il delta**
  che avevano ricevuto (non si "ripristina" il vecchio valore, così le partite
  giocate dopo restano valide) e le righe vengono marcate `voided`.

**Importante per il sito:** una partita annullata resta nello storico con
`"voided": true`. Va mostrata barrata o nascosta, ma il suo `elo_change` **non
va più conteggiato**, perché è già stato restituito.

### Tabelle del database

Utili solo se un giorno si volesse leggere il file direttamente; con l'API non
servono.

**`ihl_players`** — una riga per giocatore

| colonna | tipo | significato |
|---|---|---|
| `discord_id` | TEXT, chiave | ID Discord del giocatore |
| `elo` | INTEGER | punteggio attuale |
| `wins` / `losses` | INTEGER | vittorie e sconfitte |
| `matches` | INTEGER | partite giocate |
| `updated_at` | TEXT | ultimo aggiornamento (UTC) |

**`ihl_matches`** — **dieci righe per partita**, una per giocatore

| colonna | tipo | significato |
|---|---|---|
| `lobby_id` | INTEGER | codice della partita |
| `discord_id` | TEXT | giocatore |
| `team` | TEXT | `a` oppure `b` |
| `won` | INTEGER | 1 se ha vinto |
| `elo_before` / `elo_after` | INTEGER | punteggio prima e dopo |
| `map` | TEXT | mappa giocata |
| `voided` | INTEGER | 1 se la partita è stata annullata |
| `played_at` | TEXT | data e ora (UTC) |

Il nome visualizzato non sta qui: viene da `member_tracking.username`, che il
bot registra quando una persona entra nel server. Per chi è entrato prima che il
bot esistesse può mancare — l'API in quel caso restituisce `"name": null`.

---

## 5. L'API

**Base URL:** `http://<host>:3000/api/v1` (in produzione va messa dietro HTTPS,
vedi § 7).

Tutti gli endpoint sono **GET** e restituiscono JSON. Una richiesta con un altro
metodo riceve `405`: l'API non può scrivere nulla.

### `GET /health`

Stato del servizio e parametri del sistema ELO. Utile come *ping*.

```json
{
  "ok": true,
  "players": 42,
  "updated_at": "2026-09-25 18:04:11",
  "elo": { "starting": 1000, "floor": 100, "k_factor": 32 }
}
```

### `GET /leaderboard`

La classifica, paginata.

| parametro | default | note |
|---|---|---|
| `lega` | `pro` | `pro` oppure `open` |
| `page` | `1` | prima pagina |
| `size` | `25` | massimo `100` |

I valori fuori scala vengono riportati nei limiti, non generano errore.

```json
{
  "page": 1,
  "size": 25,
  "total": 42,
  "pages": 2,
  "updated_at": "2026-09-25 18:04:11",
  "players": [
    {
      "rank": 1,
      "discord_id": "123456789012345678",
      "name": "xazy",
      "elo": 1184,
      "wins": 12,
      "losses": 4,
      "matches": 16,
      "winrate": 75,
      "updated_at": "2026-09-25 18:04:11"
    }
  ]
}
```

`rank` è calcolato sul database, non sulla posizione nell'array: **due giocatori
a pari ELO hanno lo stesso `rank`**, e il successivo salta di conseguenza
(1, 2, 2, 4). `winrate` è una percentuale con un decimale.

### `GET /players/:discordId`

Profilo completo con lo storico.

| parametro | default | note |
|---|---|---|
| `lega` | `pro` | `pro` oppure `open` |
| `matches` | `20` | quante partite dello storico, massimo `200` |

```json
{
  "rank": 3,
  "discord_id": "123456789012345678",
  "name": "Sweet",
  "elo": 1102,
  "wins": 9, "losses": 7, "matches": 16, "winrate": 56.3,
  "total_players": 42,
  "updated_at": "2026-09-25 18:04:11",
  "history": [
    {
      "match_id": 57,
      "team": "a",
      "won": true,
      "elo_before": 1086,
      "elo_after": 1102,
      "elo_change": 16,
      "map": "Ascent",
      "voided": false,
      "played_at": "2026-09-25 18:04:11"
    }
  ]
}
```

Un ID che non ha mai giocato risponde `404 {"error": "player_not_found"}`; la
lettura **non crea** il giocatore.

### `GET /matches`

Le ultime partite, con le due squadre già ricomposte.

| parametro | default | note |
|---|---|---|
| `lega` | `pro` | `pro` oppure `open` |
| `limit` | `20` | massimo `200` |

```json
{
  "matches": [
    {
      "match_id": 57,
      "map": "Ascent",
      "winner": "a",
      "voided": false,
      "played_at": "2026-09-25 18:04:11",
      "teams": {
        "a": [ { "discord_id": "...", "elo_change": 16, "won": true } ],
        "b": [ { "discord_id": "...", "elo_change": -16, "won": false } ]
      }
    }
  ]
}
```

### Errori

| codice | quando |
|---|---|
| `401 unauthorized` | `API_TOKEN` è configurato e manca o è sbagliato |
| `404 player_not_found` / `not_found` | giocatore o rotta inesistente |
| `405 method_not_allowed` | qualsiasi metodo diverso da GET |
| `429 too_many_requests` | superato il limite di richieste al minuto per IP |

---

## 6. Note per l'integrazione

**Fusi orari.** Tutte le date sono **UTC**, nel formato `YYYY-MM-DD HH:MM:SS`.
Vanno convertite lato sito (`new Date(valore.replace(' ', 'T') + 'Z')`).

**Cache.** Le risposte hanno `Cache-Control: public, max-age=30`. La classifica
cambia solo a fine partita: interrogarla più spesso di così è inutile. Meglio
ancora, il sito può rigenerare la pagina ogni pochi minuti invece di chiamare
l'API a ogni visita.

**CORS.** Di default è consentita qualsiasi origine. Si può restringere al solo
dominio del sito con `API_ALLOWED_ORIGIN=https://www.ivpiter.it` nel `.env`.

**Limite di richieste.** 120 al minuto per IP (`API_RATE_LIMIT`). Se il sito
chiama dal server, tutte le richieste arrivano dallo stesso IP: conviene una
cache lato sito.

**Avatar e nickname.** L'API dà `discord_id` e, quando disponibile, `name`.
Per avatar e nickname aggiornati il sito può usare l'ID con l'API di Discord,
oppure si può tenere una tabella di corrispondenze lato sito (ID → nome da
mostrare, foto, ruolo nel roster).

**Se il sito gira sulla stessa VPS** può in alternativa aprire il file
`data/bot.db` in sola lettura (`mode=ro`). Funziona perché SQLite è in WAL, ma
l'API resta la strada consigliata: se un domani cambia lo schema, l'API continua
a rispondere uguale.

---

## 7. Da fare sul server (lato IVPITER)

L'API ascolta sulla porta **3000**, la stessa dei webhook Faceit. Da esporre
**solo dietro HTTPS**, con un reverse proxy. Esempio nginx:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header Host $host;
}
```

`X-Forwarded-For` è necessario: senza, il limite di richieste conterebbe tutto
il traffico come un unico IP (quello del proxy).

Variabili nel `.env` del bot:

```ini
API_ENABLED=true
API_TOKEN=                 # vuoto = aperta; se valorizzato serve X-Api-Token
API_ALLOWED_ORIGIN=*       # oppure https://www.ivpiter.it
API_CACHE_SECONDS=30
API_RATE_LIMIT=120
```

Con `API_TOKEN` impostato, ogni chiamata deve portare l'header
`X-Api-Token: <valore>` (oppure `?token=<valore>`). Il token va dato a chi
sviluppa il sito **e a nessun altro**: non va messo nel JavaScript della pagina,
che è visibile a chiunque — le chiamate con token si fanno dal server del sito.

Per disattivare l'API: `API_ENABLED=false` e riavvio.

---

## 8. Prova rapida

```bash
curl -s http://127.0.0.1:3000/api/v1/health | jq
curl -s "http://127.0.0.1:3000/api/v1/leaderboard?lega=pro&size=5" | jq '.players[] | {rank, name, elo}'
curl -s "http://127.0.0.1:3000/api/v1/leaderboard?lega=open&size=5" | jq '.players[] | {rank, name, elo}'
curl -s "http://127.0.0.1:3000/api/v1/matches?limit=3" | jq '.matches[] | {match_id, map, winner}'
```
