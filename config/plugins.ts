export default ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        baseUrl: env('SUPABASE_STORAGE_PUBLIC_URL'),
        s3Options: {
          credentials: {
            accessKeyId: env('SUPABASE_STORAGE_ACCESS_KEY'),
            secretAccessKey: env('SUPABASE_STORAGE_SECRET_KEY'),
          },
          region: env('SUPABASE_STORAGE_REGION'),
          endpoint: env('SUPABASE_STORAGE_S3_ENDPOINT'),
          forcePathStyle: true,
          params: {
            Bucket: env('SUPABASE_STORAGE_BUCKET'),
          },
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
      sizeLimit: 1000000, // 1MB
      security: {
        enableFileValidation: true,
        allowedTypes: ['image/*', 'application/pdf', 'text/*'],
        maxFileSize: 1000000, // 1MB
        sanitizeFileName: true,
      },
    },
  },
});
