export default ({ env }) => {
  const port = env.int('PORT', 1337);
  console.log(`Starting Strapi on port: ${port}`);
  
  return {
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
}};
