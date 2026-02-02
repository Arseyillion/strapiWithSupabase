export default [
  {
    origin: ['http://localhost:3000', 'https://ecndevspace.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization'],
    credentials: true,
  },
];
