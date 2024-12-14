import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import es from 'event-stream';

export interface PSTreeChild {
  PPID: string;
  PID: string;
  STAT: string;
  COMMAND: string;
}

export function psTree(pid: number | string, callback?: (err: Error | null, children?: PSTreeChild[]) => void) {
  const promise = childrenOfPid(pid);
  if (!callback) {
    return promise;
  }

  // keep compatibility for `psTree(pid, callback)`
  promise.then(children => callback(null, children))
    .catch(err => callback(err));
}

function childrenOfPid(pid: number | string): Promise<PSTreeChild[]> {
  return new Promise((resolve, reject) => {
    let headers: string[];

    if (typeof pid === 'number') {
      pid = String(pid);
    }

    //
    // The `ps-tree` module behaves differently on *nix vs. Windows
    // by spawning different programs and parsing their output.
    //
    // Linux:
    // 1. " <defunct> " need to be striped
    // ```bash
    // $ ps -A -o comm,ppid,pid,stat
    // COMMAND          PPID   PID STAT
    // bbsd             2899 16958 Ss
    // watch <defunct>  1914 16964 Z
    // ps              20688 16965 R+
    // ```
    //
    // Darwin:
    // $ ps -A -o comm,ppid,pid,stat
    // COMM              PPID   PID STAT
    // /sbin/launchd        0     1 Ss
    // /usr/libexec/Use     1    43 Ss
    //
    // Win32:
    // 1. wmic PROCESS WHERE ParentProcessId=4604 GET Name,ParentProcessId,ProcessId,Status)
    // 2. The order of head columns is fixed
    // ```shell
    // > wmic PROCESS GET Name,ProcessId,ParentProcessId,Status
    // Name                          ParentProcessId  ProcessId   Status
    // System Idle Process           0                0
    // System                        0                4
    // smss.exe                      4                228
    // ```

    let processLister: ChildProcessWithoutNullStreams;
    if (process.platform === 'win32') {
      // See also: https://github.com/nodejs/node-v0.x-archive/issues/2318
      processLister = spawn('wmic.exe', [ 'PROCESS', 'GET', 'Name,ProcessId,ParentProcessId,Status' ]);
    } else {
      processLister = spawn('ps', [ '-A', '-o', 'ppid,pid,stat,comm' ]);
    }

    es.pipeline(
      // spawn('ps', ['-A', '-o', 'ppid,pid,stat,comm']).stdout,
      processLister.stdout as any,
      es.split(),
      es.map((line: string, cb: (...args: any[]) => void) => { // this could parse alot of unix command output
        const columns = line.trim().split(/\s+/);
        if (!headers) {
          headers = columns;

          //
          // Rename Win32 header name, to as same as the linux, for compatible.
          //
          headers = headers.map(normalizeHeader);
          return cb();
        }

        const row: Record<string, string | undefined> = {};
        // For each header
        const h = headers.slice();
        while (h.length) {
          const key = h.shift();
          row[key!] = h.length ? columns.shift() : columns.join(' ');
        }
        return cb(null, row);
      }),
      es.writeArray((_err: any, ps: any[]) => {
        const parents: Record<string, true> = {};
        const children: PSTreeChild[] = [];
        parents[pid] = true;
        ps.forEach((proc: any) => {
          if (parents[proc.PPID]) {
            parents[proc.PID] = true;
            children.push(proc);
          }
        });
        resolve(children);
      }),
    ).on('error', reject);
  });
}

// alias to pstree
export const pstree = psTree;

/**
 * Normalizes the given header `str` from the Windows
 * title to the *nix title.
 *
 * @param {string} str Header string to normalize
 */
function normalizeHeader(str: string) {
  switch (str) {
    case 'Name': // for win32
    case 'COMM': // for darwin
      return 'COMMAND';
    case 'ParentProcessId':
      return 'PPID';
    case 'ProcessId':
      return 'PID';
    case 'Status':
      return 'STAT';
    default:
      return str;
  }
}
