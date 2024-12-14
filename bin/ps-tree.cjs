#!/usr/bin/env node

//
// Change the default parent PID if running
// under Windows.
//
let ppid = 1;
if (process.platform === 'win32') {
  ppid = 0;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('..').psTree(process.argv[2] || ppid).then(children => {
  console.log(children);
});
