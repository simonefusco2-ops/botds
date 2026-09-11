/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const axios = require('axios');
const config = require('../../config');

const client = axios.create({
  baseURL: 'https://open.faceit.com/data/v4',
  headers: config.faceitApiKey ? { Authorization: `Bearer ${config.faceitApiKey}` } : {},
  timeout: 8000,
});

async function getPlayerByNickname(nickname) {
  try {
    const { data } = await client.get('/players', { params: { nickname } });
    return data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

module.exports = { getPlayerByNickname };
