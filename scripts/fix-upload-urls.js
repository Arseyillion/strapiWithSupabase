/* eslint-disable no-console */
const { createStrapi, compileStrapi } = require('@strapi/strapi');

const normalizeBaseUrl = (value) => (value || '').replace(/\/+$/, '');

const buildFileKey = ({ hash, ext, path }, rootPath) => {
  const filePrefix = rootPath ? `${rootPath.replace(/\/+$/, '')}/` : '';
  const pathPart = path ? `${path.replace(/^\/+|\/+$/g, '')}/` : '';
  return `${filePrefix}${pathPart}${hash}${ext}`;
};

const buildUrl = (baseUrl, file, rootPath) => {
  const cleanBase = normalizeBaseUrl(baseUrl);
  if (!cleanBase || !file?.hash || !file?.ext) {
    return file?.url || null;
  }
  return `${cleanBase}/${buildFileKey(file, rootPath)}`;
};

const main = async () => {
  const { appDir, distDir } = await compileStrapi({ appDir: process.cwd() });
  const strapi = await createStrapi({ appDir, distDir }).load();
  const baseUrl = strapi.config.get('plugin::upload.providerOptions.baseUrl');
  const rootPath = strapi.config.get('plugin::upload.providerOptions.rootPath', '');
  const fileModel = strapi.getModel('plugin::upload.file');
  const tableName = fileModel?.collectionName || 'files';

  const hasPathColumn = await strapi.db.connection.schema.hasColumn(tableName, 'path');
  const hasFormatsColumn = await strapi.db.connection.schema.hasColumn(tableName, 'formats');

  if (!baseUrl) {
    console.error('Missing plugin::upload.providerOptions.baseUrl. Aborting.');
    await strapi.destroy();
    process.exit(1);
  }

  const select = ['id', 'url', 'hash', 'ext'];
  if (hasPathColumn) {
    select.push('path');
  }
  if (hasFormatsColumn) {
    select.push('formats');
  }

  const files = await strapi.db.query('plugin::upload.file').findMany({ select });

  let updated = 0;

  for (const file of files) {
    const nextUrl = buildUrl(baseUrl, file, rootPath);
    let formats = hasFormatsColumn ? file.formats : undefined;
    let formatsChanged = false;

    if (formats && typeof formats === 'object') {
      const nextFormats = { ...formats };
      for (const key of Object.keys(nextFormats)) {
        const fmt = nextFormats[key];
        if (!fmt || !fmt.hash || !fmt.ext) {
          continue;
        }
        const fmtPath = fmt.path ?? (hasPathColumn ? file.path : null) ?? null;
        const nextFmtUrl = buildUrl(
          baseUrl,
          { hash: fmt.hash, ext: fmt.ext, path: fmtPath, url: fmt.url },
          rootPath
        );
        if (nextFmtUrl && fmt.url !== nextFmtUrl) {
          nextFormats[key] = { ...fmt, url: nextFmtUrl };
          formatsChanged = true;
        }
      }
      formats = formatsChanged ? nextFormats : formats;
    }

    const urlChanged = nextUrl && file.url !== nextUrl;

    if (urlChanged || formatsChanged) {
      await strapi.db.query('plugin::upload.file').update({
        where: { id: file.id },
        data: {
          url: urlChanged ? nextUrl : file.url,
          ...(hasFormatsColumn ? { formats } : {}),
        },
      });
      updated += 1;
    }
  }

  console.log(`Updated ${updated} upload record(s).`);
  await strapi.destroy();
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
