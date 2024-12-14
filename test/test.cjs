/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-restricted-modules */
const path = require('node:path');
const cp = require('node:child_process');
const test = require('tape');
const treeKill = require('tree-kill');
const { psTree } = require('..');

const scripts = {
  parent: path.join(__dirname, 'exec', 'parent.cjs'),
  child: path.join(__dirname, 'exec', 'child.cjs'),
};

test('Spawn a Parent process which has ten Child processes', function(t) {
  t.timeoutAfter(10000);
  const parent = cp.spawn('node', [ scripts.parent ]);

  parent.stdout.on('data', function() {
    psTree(parent.pid, function(error, children) {
      if (error) {
        t.error(error);
        t.end();
        return;
      }

      t.equal(children.length, 10, 'There should be 10 active child processes');
      if (children.length !== 10) {
        t.comment(parent.pid.toString());
        t.comment(JSON.stringify(children, null, 2));
      }

      treeKill(parent.pid, function(error) {
        if (error) {
          t.error(error);
          t.end();
          return;
        }
        t.end();
      });
    });
  });
});

test('Spawn a Child Process which has zero Child processes', function(t) {
  t.timeoutAfter(10000);
  const child = cp.spawn('node', [ scripts.child ]);

  child.stdout.on('data', function() {
    psTree(child.pid, function(error, children) {
      if (error) {
        t.error(error);
        t.end();
        return;
      }

      t.equal(children.length, 0, 'There should be no active child processes');
      if (children.length !== 0) {
        t.comment(child.pid.toString());
        t.comment(JSON.stringify(children, null, 2));
      }

      treeKill(child.pid, function(error) {
        if (error) {
          t.error(error);
          t.end();
          return;
        }
        t.end();
      });
    });
  });
});

test('Call psTree without supplying a Callback', function(t) {
  const errmsg = 'Error: childrenOfPid(pid, callback) expects callback';

  // Attempt to call psTree without a callback
  try {
    psTree(1234);
  } catch (e) {
    t.equal(e.toString(), errmsg);
  }

  t.end();
});

test('Directly Execute bin/ps-tree.cjs', function(t) {
  cp.exec('node ./bin/ps-tree.cjs', function(error) {
    if (error !== null) {
      t.error(error);
      t.end();
      return;
    }
    t.end();
  });
});
