const axios = require('axios');
const config = require('../../config');

let token = null;
let tokenExpiresAt = 0;

async function getAppToken(forceRefresh = false) {
  if (!forceRefresh && token && Date.now() < tokenExpiresAt) return token;

  const { data } = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: config.twitchClientId,
      client_secret: config.twitchClientSecret,
      grant_type: 'client_credentials',
    },
    timeout: 10000,
  });

  token = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return token;
}

async function helix(path, params, allowRetry = true) {
  const accessToken = await getAppToken();

  try {
    const { data } = await axios.get(`https://api.twitch.tv/helix${path}`, {
      params,
      headers: { 'Client-Id': config.twitchClientId, Authorization: `Bearer ${accessToken}` },
      timeout: 10000,
      // Twitch vuole parametri ripetuti (user_login=a&user_login=b), non indicizzati.
      paramsSerializer: { indexes: null },
    });
    return data;
  } catch (err) {
    if (err.response?.status === 401 && allowRetry) {
      await getAppToken(true);
      return helix(path, params, false);
    }
    throw err;
  }
}

/** Restituisce solo gli streamer attualmente in diretta, max 100 login per richiesta. */
async function getStreams(logins) {
  const streams = [];

  for (let i = 0; i < logins.length; i += 100) {
    const chunk = logins.slice(i, i + 100);
    const data = await helix('/streams', { user_login: chunk, first: 100 });
    streams.push(...(data.data || []));
  }

  return streams;
}

async function getUserByLogin(login) {
  const data = await helix('/users', { login });
  return data.data?.[0] || null;
}

/** Accetta "nome", "@nome", "twitch.tv/nome" o l'URL completo. */
function normalizeLogin(input) {
  return String(input)
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?twitch\.tv\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
}

module.exports = { getStreams, getUserByLogin, normalizeLogin };
