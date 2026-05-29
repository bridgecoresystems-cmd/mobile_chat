export default defineNuxtConfig({
  devtools:  { enabled: false },
  devServer: { port: 3002 },
  runtimeConfig: {
    public: { apiUrl: 'http://localhost:3001' },
  },
  app: {
    head: {
      title: 'konekt admin',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap' },
      ],
    },
  },
  css: ['~/assets/css/main.css'],
})
