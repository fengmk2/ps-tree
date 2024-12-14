/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-restricted-modules */
const path = require('node:path');
const cp = require('node:child_process');

let started = false;
const spawned = {};

for (let i = 0; i < 10; i++) {
  const child = cp.spawn('node', [ path.join('test', 'exec', 'child.cjs') ]);
  child.stdout.on('data', function(child) {
    spawned[child.pid] = true;
  }.bind(this, child));
}

setInterval(() => {
  if (started) return;
  if (Object.keys(spawned).length !== 10) return;
  console.log(process.pid);
  started = true;
}, 100); // Does nothing, but prevents exit
