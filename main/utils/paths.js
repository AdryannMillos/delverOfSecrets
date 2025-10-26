const path = require('path');

function getRootLogDir() {
  return path.join(process.env.USERPROFILE, 'AppData', 'Local', 'Apps', '2.0', 'Data');
}

module.exports = { getRootLogDir };
