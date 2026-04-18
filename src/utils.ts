/**
 * Read all data from stdin as a single string.
 * Preserves exact bytes (including newlines inside JSON strings).
 */
export function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');

    process.stdin.on('data', (chunk: string) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data);
    });

    process.stdin.on('error', (err: Error) => {
      reject(err);
    });
  });
}
