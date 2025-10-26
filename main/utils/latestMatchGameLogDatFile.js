const fs = require('fs');
const path = require('path');

function findMatchingFilesRecursive(dir, matches = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      try {
        findMatchingFilesRecursive(fullPath, matches);
      } catch (e) {
      }
    } else if (
      entry.name.startsWith('Match_GameLog_') &&
      entry.name.endsWith('.dat')
    ) {
      const stats = fs.statSync(fullPath);
      matches.push({ path: fullPath, ctime: stats.ctime });
    }
  }

  return matches;
}

function getLatestMatchGameLogDatFile(rootDir) {
  const matches = findMatchingFilesRecursive(rootDir);

  if (matches.length === 0) {
    console.log('No matching .dat files found.');
    return null;
  }

  matches.sort((a, b) => b.ctime - a.ctime);
  return matches[0].path;
}

const rootSearchDir = path.join(
  process.env.USERPROFILE,
  'AppData',
  'Local',
  'Apps',
  '2.0',
  'Data'
);

function latestMatchGameLogDatFile() {
  return getLatestMatchGameLogDatFile(rootSearchDir);
}

module.exports = latestMatchGameLogDatFile;