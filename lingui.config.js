/** @type {import('@lingui/conf').LinguiConfig} */
module.exports = {
  locales: [
    'en',
    'ca',
    'de',
    'en-GB',
    'es',
    'fi',
    'fr',
    'ga',
    'hi',
    'hu',
    'id',
    'it',
    'ja',
    'ko',
    'pt-BR',
    'ru',
    'tr',
    'uk',
    'zh-CN',
    'zh-HK',
    'zh-TW',
    'he',
  ],
  catalogs: [
    {
      path: '<rootDir>/src/locale/locales/{locale}/messages',
      include: ['src'],
    },
  ],
  format: 'po',
}
