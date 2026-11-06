// Fixed upstream destinations; Transport rejects URLs outside this registry.
export const URLS = Object.freeze({
  login: 'https://sg-public-api.hoyoverse.com/account/ma-passport/api/appLoginByPassword',
  webLogin: 'https://sg-public-api.hoyolab.com/account/ma-passport/api/webLoginByPassword',
  info: 'https://sg-public-api.hoyoverse.com/account/ma-verifier/api/getActionTicketInfo',
  send: 'https://sg-public-api.hoyoverse.com/account/ma-verifier/api/createEmailCaptchaByActionTicket',
  verify: 'https://sg-public-api.hoyoverse.com/account/ma-verifier/api/verifyActionTicketPartly',
  exchange: 'https://sg-public-api.hoyoverse.com/account/ma-passport/token/getBySToken',
  roles:
    'https://api-account-os.hoyoverse.com/account/binding/api/getUserGameRolesOfRegionByCookieToken',
  labRoles: 'https://api-os-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie',
  index: 'https://sg-public-api.hoyolab.com/event/game_record/genshin/api/index',
  characters: 'https://sg-public-api.hoyolab.com/event/game_record/genshin/api/character/list',
  detail: 'https://sg-public-api.hoyolab.com/event/game_record/genshin/api/character/detail',
  authkey: 'https://api-account-os.hoyoverse.com/binding/api/genAuthKeyByCookieToken',
  wishes: 'https://public-operation-hk4e-sg.hoyoverse.com/gacha_info/api/getGachaLog',
  redeem: 'https://sg-hk4e-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkey',
});
