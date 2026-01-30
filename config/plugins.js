module.exports = () => ({
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
        allowedFileTypes: [
          'images/*',
          'files/*'
        ],
        maxFileSize: 1000000, // 1MB
        sanitizeFileName: true,
      },
    },
  },
});
