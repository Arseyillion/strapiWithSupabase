export default () => ({
  upload: {
    config: {
      sizeLimit: 1000000, // 1MB
      providerOptions: {
        local: {
          cache: false,
        },
      },
      security: {
        enableFileValidation: true,
        allowedTypes: [
          'image/*',
          'application/pdf',
          'text/*'
        ],
        maxFileSize: 1000000, // 1MB
        sanitizeFileName: true,
      },
    },
  },
});
