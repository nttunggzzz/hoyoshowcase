export function demand(ok, message) {
  if (!ok) throw new Error(message);
}
export function uidServer(value, gameBiz = 'hk4e_global') {
  const uid = String(value);
  if (gameBiz === 'hkrpg_global' || gameBiz === 'hsr') {
    demand(/^[6789]\d{8}$/.test(uid), 'UID HSR Global phải có 9 chữ số bắt đầu 6, 7, 8 hoặc 9.');
    return {
      6: 'prod_official_usa',
      7: 'prod_official_euro',
      8: 'prod_official_asia',
      9: 'prod_official_cht',
    }[uid[0]];
  }
  demand(
    /^(?:[6789]\d{8}|18\d{8})$/.test(uid),
    'UID Global phải có 9 chữ số, hoặc 10 chữ số bắt đầu 18.',
  );
  return { 6: 'os_usa', 7: 'os_euro', 8: 'os_asia', 9: 'os_cht', 18: 'os_asia' }[uid.slice(0, -8)];
}
