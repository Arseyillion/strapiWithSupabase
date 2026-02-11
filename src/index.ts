import fs from 'fs';
import fse from 'fs-extra';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import type { Core } from '@strapi/strapi';

const normalizePath = (value: string) => value.replace(/\\/g, '/');
const tmpPrefix = normalizePath(path.join(os.tmpdir(), 'strapi-upload-'));
const requireFrom = createRequire(__filename);

const isStrapiTmpPath = (target: unknown) => {
  if (typeof target !== 'string') {
    return false;
  }
  return normalizePath(target).includes(tmpPrefix);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const sleepSync = (ms: number) => {
  const shared = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(shared, 0, 0, ms);
};
const resolveUploadFsExtra = () => {
  try {
    const uploadEntry = requireFrom.resolve('@strapi/upload');
    const uploadRequire = createRequire(uploadEntry);
    return uploadRequire('fs-extra');
  } catch {
    return null;
  }
};
const withRetry = async <T>(fn: () => Promise<T>, maxRetries: number, baseDelayMs: number) => {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (err: any) {
      const code = err?.code;
      const retryable = code === 'EPERM' || code === 'EBUSY' || code === 'ENOTEMPTY';
      if (!retryable || attempt === maxRetries) {
        throw err;
      }
      await sleep(baseDelayMs * (attempt + 1));
    }
  }
  return undefined as T;
};
const withRetrySync = <T>(fn: () => T, maxRetries: number, baseDelayMs: number) => {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return fn();
    } catch (err: any) {
      const code = err?.code;
      const retryable = code === 'EPERM' || code === 'EBUSY' || code === 'ENOTEMPTY';
      if (!retryable || attempt === maxRetries) {
        throw err;
      }
      sleepSync(baseDelayMs * (attempt + 1));
    }
  }
  return undefined as T;
};

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    if (process.platform !== 'win32') {
      return;
    }

    const patchFsUnlink = () => {
      const marker = '__strapiTmpUnlinkPatched';
      if ((fs as any)[marker]) {
        return;
      }
      (fs as any)[marker] = true;

      const maxRetries = 8;
      const baseDelayMs = 150;

      const originalUnlink = fs.unlink.bind(fs);
      const originalUnlinkSync = fs.unlinkSync.bind(fs);
      const originalUnlinkPromisify = (fs.unlink as any).__promisify__;
      const originalRm = fs.rm?.bind(fs);
      const originalRmSync = fs.rmSync?.bind(fs);
      const originalRmPromisify = fs.rm ? (fs.rm as any).__promisify__ : undefined;

      const unlinkWrapper = (target: any, cb?: (err?: NodeJS.ErrnoException | null) => void) => {
        if (typeof target !== 'string' || !isStrapiTmpPath(target)) {
          return originalUnlink(target, cb as any);
        }
        if (typeof cb !== 'function') {
          return originalUnlink(target, cb as any);
        }
        withRetry(
          () =>
            new Promise<void>((resolve, reject) => {
              originalUnlink(target, (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            }),
          maxRetries,
          baseDelayMs
        )
          .then(() => cb(null))
          .catch((err: any) => {
            const code = err?.code;
            strapi.log.warn(
              `Upload temp cleanup failed (${code || 'unknown'}). Leaving ${target} on disk.`
            );
            cb(null);
          });
      };
      (unlinkWrapper as any).__promisify__ = originalUnlinkPromisify;
      fs.unlink = unlinkWrapper as any;

      fs.unlinkSync = (target: any) => {
        if (typeof target !== 'string' || !isStrapiTmpPath(target)) {
          return originalUnlinkSync(target);
        }
        try {
          return withRetrySync(() => originalUnlinkSync(target), maxRetries, baseDelayMs);
        } catch (err: any) {
          const code = err?.code;
          strapi.log.warn(
            `Upload temp cleanup failed (${code || 'unknown'}). Leaving ${target} on disk.`
          );
          return;
        }
      };

      if (originalRm) {
        const rmWrapper = (
          target: any,
          options?: any,
          cb?: (err?: NodeJS.ErrnoException | null) => void
        ) => {
          if (typeof options === 'function') {
            cb = options;
            options = undefined;
          }
          if (typeof target !== 'string' || !isStrapiTmpPath(target)) {
            return originalRm(target, options, cb);
          }
          if (typeof cb !== 'function') {
            return originalRm(target, options, cb);
          }
          withRetry(
            () =>
              new Promise<void>((resolve, reject) => {
                originalRm(target, options, (err: NodeJS.ErrnoException | null) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                });
              }),
            maxRetries,
            baseDelayMs
          )
            .then(() => cb(null))
            .catch((err: any) => {
              const code = err?.code;
              strapi.log.warn(
                `Upload temp cleanup failed (${code || 'unknown'}). Leaving ${target} on disk.`
              );
              cb(null);
            });
        };
        (rmWrapper as any).__promisify__ = originalRmPromisify;
        fs.rm = rmWrapper as any;
      }

      if (originalRmSync) {
        fs.rmSync = (target: any, options?: any) => {
          if (typeof target !== 'string' || !isStrapiTmpPath(target)) {
            return originalRmSync(target, options);
          }
          try {
            return withRetrySync(() => originalRmSync(target, options), maxRetries, baseDelayMs);
          } catch (err: any) {
            const code = err?.code;
            strapi.log.warn(
              `Upload temp cleanup failed (${code || 'unknown'}). Leaving ${target} on disk.`
            );
            return;
          }
        };
      }

      if (fs.promises?.unlink) {
        const originalPromisesUnlink = fs.promises.unlink.bind(fs.promises);
        fs.promises.unlink = async (target: any) => {
          if (typeof target !== 'string' || !isStrapiTmpPath(target)) {
            return originalPromisesUnlink(target);
          }
          try {
            return await withRetry(() => originalPromisesUnlink(target), maxRetries, baseDelayMs);
          } catch (err: any) {
            const code = err?.code;
            strapi.log.warn(
              `Upload temp cleanup failed (${code || 'unknown'}). Leaving ${target} on disk.`
            );
            return;
          }
        };
      }

      if (fs.promises?.rm) {
        const originalPromisesRm = fs.promises.rm.bind(fs.promises);
        fs.promises.rm = async (target: any, options?: any) => {
          if (typeof target !== 'string' || !isStrapiTmpPath(target)) {
            return originalPromisesRm(target, options);
          }
          try {
            return await withRetry(() => originalPromisesRm(target, options), maxRetries, baseDelayMs);
          } catch (err: any) {
            const code = err?.code;
            strapi.log.warn(
              `Upload temp cleanup failed (${code || 'unknown'}). Leaving ${target} on disk.`
            );
            return;
          }
        };
      }
    };

    const patchFsExtraRemove = (fsExtra: typeof fse | null) => {
      if (!fsExtra) {
        return;
      }
      const marker = '__strapiTmpCleanupPatched';
      if ((fsExtra as any)[marker]) {
        return;
      }
      (fsExtra as any)[marker] = true;

      const originalRemove = fsExtra.remove.bind(fsExtra);

      fsExtra.remove = async (target: any) => {
        if (!isStrapiTmpPath(target)) {
          return originalRemove(target);
        }

        const maxRetries = 8;
        const baseDelayMs = 150;

        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
          try {
            return await originalRemove(target);
          } catch (err: any) {
            const code = err?.code;
            const retryable = code === 'EPERM' || code === 'EBUSY' || code === 'ENOTEMPTY';
            if (!retryable || attempt === maxRetries) {
              strapi.log.warn(
                `Upload temp cleanup failed (${code || 'unknown'}). Leaving ${target} on disk.`
              );
              return;
            }
            await sleep(baseDelayMs * (attempt + 1));
          }
        }
      };
    };

    patchFsExtraRemove(fse);
    const uploadFsExtra = resolveUploadFsExtra();
    if (uploadFsExtra && uploadFsExtra !== fse) {
      patchFsExtraRemove(uploadFsExtra);
    }
    patchFsUnlink();
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/* { strapi }: { strapi: Core.Strapi } */) {},
};
