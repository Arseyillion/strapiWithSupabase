export default [
  {
    method: 'GET',
    path: '/blog-categories',
    handler: 'api::blog.blog.getCategoriesEnum',
    config: {
      auth: false,
    },
  },
];
