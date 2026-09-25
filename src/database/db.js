/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const dbDir = path.dirname(config.databasePath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    faceit_player_id TEXT UNIQUE,
    faceit_nickname TEXT,
    wins INTEGER NOT NULL DEFAULT 0,
    matches_played INTEGER NOT NULL DEFAULT 0,
    linked_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tickets (
    channel_id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS active_matches (
    match_id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    team_a_channel_id TEXT,
    team_b_channel_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS member_tracking (
    discord_id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    username TEXT,
    invite_code TEXT,
    inviter_id TEXT,
    joined_at TEXT,
    left_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_member_tracking_inviter ON member_tracking(inviter_id);

  CREATE TABLE IF NOT EXISTS twitch_streamers (
    login TEXT PRIMARY KEY,
    display_name TEXT,
    added_by TEXT,
    is_live INTEGER NOT NULL DEFAULT 0,
    last_stream_id TEXT,
    added_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ihl_players (
    discord_id TEXT PRIMARY KEY,
    elo INTEGER NOT NULL,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    matches INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Una riga per giocatore per partita: alimenta lo storico personale.
  CREATE TABLE IF NOT EXISTS ihl_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lobby_id INTEGER,
    discord_id TEXT NOT NULL,
    team TEXT NOT NULL,
    won INTEGER NOT NULL,
    elo_before INTEGER NOT NULL,
    elo_after INTEGER NOT NULL,
    map TEXT,
    voided INTEGER NOT NULL DEFAULT 0,
    played_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_ihl_matches_player ON ihl_matches(discord_id);

  -- Lo stato della lobby è persistito: un riavvio del bot non fa perdere una
  -- partita in corso, che resta recuperabile dal messaggio già pubblicato.
  CREATE TABLE IF NOT EXISTS ihl_lobbies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    state TEXT NOT NULL,
    players TEXT NOT NULL DEFAULT '[]',
    captain_a TEXT,
    captain_b TEXT,
    team_a TEXT NOT NULL DEFAULT '[]',
    team_b TEXT NOT NULL DEFAULT '[]',
    map_pool TEXT NOT NULL DEFAULT '[]',
    banned_maps TEXT NOT NULL DEFAULT '[]',
    chosen_map TEXT,
    side_a TEXT,
    turn TEXT,
    voice_a_id TEXT,
    voice_b_id TEXT,
    text_channel_id TEXT,
    votes TEXT NOT NULL DEFAULT '{}',
    vote_deadline INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS social_feeds (
    feed_url TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    label TEXT,
    last_item_id TEXT,
    added_by TEXT,
    added_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// CREATE TABLE IF NOT EXISTS non modifica le tabelle già esistenti: la colonna
// del tipo di ticket va aggiunta a mano sui database creati prima di questa funzione.
const ticketColumns = db.prepare('PRAGMA table_info(tickets)').all();
if (!ticketColumns.some((column) => column.name === 'type')) {
  db.exec("ALTER TABLE tickets ADD COLUMN type TEXT NOT NULL DEFAULT 'supporto'");
}

const lobbyColumns = db.prepare('PRAGMA table_info(ihl_lobbies)').all().map((column) => column.name);
if (!lobbyColumns.includes('map_pool')) {
  db.exec("ALTER TABLE ihl_lobbies ADD COLUMN map_pool TEXT NOT NULL DEFAULT '[]'");
}
if (!lobbyColumns.includes('text_channel_id')) {
  db.exec('ALTER TABLE ihl_lobbies ADD COLUMN text_channel_id TEXT');
}
if (!lobbyColumns.includes('votes')) {
  db.exec("ALTER TABLE ihl_lobbies ADD COLUMN votes TEXT NOT NULL DEFAULT '{}'");
}
if (!lobbyColumns.includes('vote_deadline')) {
  db.exec('ALTER TABLE ihl_lobbies ADD COLUMN vote_deadline INTEGER');
}

module.exports = db;
