'use strict';
const { execSync } = require('child_process');
const { writeFileSync } = require('fs');
const { homedir } = require('os');

const npmToken = process.env.NPM_TOKEN;
console.log('Token length:', npmToken ? npmToken.length : 0);
console.log('Token prefix:', npmToken ? npmToken.substring(0, 8) : 'MISSING');

writeFileSync(homedir() + '/.npmrc', `//registry.npmjs.org/:_authToken=${npmToken}\n`);

const NPM = '/nix/store/jfar9wnj6kvr0gr6klh1gk7vgckkfr5j-nodejs-20.20.0/bin/npm';

try {
  const whoami = execSync(`${NPM} whoami --registry=https://registry.npmjs.org/ 2>&1`, { encoding: 'utf8' });
  console.log('Logged in as:', whoami.trim());
} catch(e) {
  console.log('whoami error:', (e.stdout || e.message).trim());
}

// Check if name exists on npm
try {
  const view = execSync(`${NPM} view nexusos-ce-encoder 2>&1`, { encoding: 'utf8' });
  console.log('npm view result:', view.trim().substring(0, 300));
} catch(e) {
  const msg = (e.stdout || e.message);
  if (msg.includes('404')) {
    console.log('Package NOT found on npm (name is free)');
  } else {
    console.log('view error:', msg.substring(0, 200));
  }
}
