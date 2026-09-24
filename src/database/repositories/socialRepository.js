/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const db = require('../db');

const addStmt = db.prepare(`
  INSERT INTO social_feeds (feed_url, platform, label, added_by)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(feed_url) DO UPDATE SET platform = excluded.platform, label = excluded.label
`);

const removeStmt = db.prepare('DELETE FROM social_feeds WHERE feed_url = ?');
const removeByLabelStmt = db.prepare('DELETE FROM social_feeds WHERE platform = ? OR label = ?');
const listStmt = db.prepare('SELECT * FROM social_feeds ORDER BY platform ASC');
const findStmt = db.prepare('SELECT * FROM social_feeds WHERE feed_url = ?');
const setLastItemStmt = db.prepare('UPDATE social_feeds SET last_item_id = ? WHERE feed_url = ?');

function add(feedUrl, platform, label, addedBy) {
  addStmt.run(feedUrl, platform, label, addedBy);
}

function remove(feedUrl) {
  return removeStmt.run(feedUrl).changes > 0;
}

/** Permette di rimuovere indicando la piattaforma o l'etichetta, senza reincollare l'URL. */
function removeByLabel(value) {
  return removeByLabelStmt.run(value, value).changes;
}

function list() {
  return listStmt.all();
}

function find(feedUrl) {
  return findStmt.get(feedUrl);
}

function setLastItem(feedUrl, itemId) {
  setLastItemStmt.run(itemId, feedUrl);
}

module.exports = { add, remove, removeByLabel, list, find, setLastItem };
