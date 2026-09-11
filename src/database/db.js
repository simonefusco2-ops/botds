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
`);

module.exports = db;
