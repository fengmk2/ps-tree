# @fengmk2/ps-tree

[![NPM version][npm-image]][npm-url]
[![Node.js CI](https://github.com/fengmk2/ps-tree/actions/workflows/nodejs.yml/badge.svg)](https://github.com/fengmk2/ps-tree/actions/workflows/nodejs.yml)
[![Test coverage][codecov-image]][codecov-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/@fengmk2/ps-tree.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@fengmk2/ps-tree
[codecov-image]: https://codecov.io/github/fengmk2/ps-tree/coverage.svg?branch=master
[codecov-url]: https://codecov.io/github/fengmk2/ps-tree?branch=master
[snyk-image]: https://snyk.io/test/npm/@fengmk2/ps-tree/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@fengmk2/ps-tree
[download-image]: https://img.shields.io/npm/dm/@fengmk2/ps-tree.svg?style=flat-square
[download-url]: https://npmjs.org/package/@fengmk2/ps-tree

> Fork [indexzero/ps-tree](https://github.com/indexzero/ps-tree), refactor in TypeScript to support CommonJS and ESM both

Sometimes you cannot kill child processes like you would expect, this a feature of UNIX.

>in UNIX, a process may terminate by using the exit call, and it's parent process may wait for that event by using the wait system call. the wait system call returns the process identifier of a terminated child, so that the parent tell which of the possibly many children has terminated. If the parent terminates, however, all it's children have assigned as their new parent the init process. Thus, the children still have a parent to collect their status and execution statistics.
> (from "operating system concepts")

Solution: use `ps-tree` to get all processes that a `child_process` may have started, so that they may all be terminated.

```ts
import cp from 'node:child_process';

const child = cp.exec("node -e 'while (true);'", function () {...});

// This will not actually kill the child it will kill the `sh` process.
child.kill();
```

wtf? it's because exec actually works like this:

```js
function exec(cmd, cb) {
  spawn('sh', ['-c', cmd]);
  ...
}
```

`sh` starts parses the command string and starts processes, and waits for them to terminate, but `exec` returns a process object with the pid of the `sh` process.
However, since it is in `wait` mode killing it does not kill the children.

Use `ps-tree` like this:

```js
import cp from 'node:child_process';
import { psTree } from '@fengmk2/ps-tree';

const child = cp.exec("node -e 'while (true);'", function () { /*...*/ });

psTree(child.pid)
  .then(children => {
    cp.spawn('kill', ['-9'].concat(children.map(function (p) { return p.PID })));
  }).catch(err => {
    console.error(err);
  });
```

If you prefer to run **psTree** from the command line, use: `node ./bin/ps-tree.js`

## Cross Platform support

The `ps-tree` module behaves differently on *nix vs. Windows by spawning different programs and parsing their output. This is based on `process.platform` and not on checking to see if a `ps` compatible program exists on the system.

### *nix

1. `" <defunct> "` need to be striped

```bash
$ ps -A -o comm,ppid,pid,stat
COMMAND          PPID   PID STAT
bbsd             2899 16958 Ss
watch <defunct>  1914 16964 Z
ps              20688 16965 R+
```

### Windows

1. `wmic PROCESS WHERE ParentProcessId=4604 GET Name,ParentProcessId,ProcessId,Status)`
2. The order of head columns is fixed

```shell
> wmic PROCESS GET Name,ProcessId,ParentProcessId,Status
Name                          ParentProcessId  ProcessId   Status
System Idle Process           0                0
System                        0                4
smss.exe                      4                228
```

### Mac/Darwin

1. `" "` need to be striped

```shell
$ ps -A -o comm,ppid,pid,stat
COMM              PPID   PID STAT
/sbin/launchd        0     1 Ss
/usr/libexec/Use     1    43 Ss
```

### LICENSE

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=fengmk2/ps-tree)](https://github.com/fengmk2/ps-tree/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
