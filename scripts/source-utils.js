import crypto from 'node:crypto';
import fs from 'node:fs';

const lfsVersion = 'version https://git-lfs.github.com/spec/v1';

export function sourceFingerprint(absolutePath, displayPath = absolutePath) {
  const buffer = fs.readFileSync(absolutePath);
  const firstLine = buffer.subarray(0, lfsVersion.length + 2).toString('utf8').split(/\r?\n/)[0];
  if (firstLine === lfsVersion) {
    const error = new Error(
      `Unhydrated Git LFS pointer: ${displayPath}. Hydrate with git lfs pull or restore a verified local LFS object, then retry.`
    );
    error.code = 'UNHYDRATED_LFS_POINTER';
    throw error;
  }

  return {
    bytes: buffer.length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
}
