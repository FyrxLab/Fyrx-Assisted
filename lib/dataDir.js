/**
 * lib/dataDir.js
 * Persistent state lives in the *consuming bot's* working directory, not
 * inside node_modules/fyrx-assisted/data — node_modules gets wiped on every
 * reinstall/redeploy, which would silently lose every guild's replies.
 */

const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'fyrx-assisted-data');

module.exports = { DATA_DIR };
