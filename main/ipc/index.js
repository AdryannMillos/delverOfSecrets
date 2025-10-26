const registerMatchHandlers = require('./matches');
const registerOverlayHandlers = require('./overlays');

function registerIpcHandlers() {
  registerMatchHandlers();
  registerOverlayHandlers();
}

module.exports = registerIpcHandlers;
