import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePityFromRecords,
  fetchLivePity,
  getPityData,
  STANDARD_5_GENSHIN,
  STANDARD_5_HSR,
} from '../src/server/pity.mjs';

test('computePityFromRecords: Genshin 5★ lệch rate (Standard) -> charGuaranteed = true', () => {
  const records = [
    { id: '1001', time: '2024-01-01 10:00:00', gacha_type: '301', rank_type: '3', name: 'Cool Steel' },
    { id: '1002', time: '2024-01-01 10:01:00', gacha_type: '301', rank_type: '5', name: 'Diluc' }, // Lệch 50/50
    { id: '1003', time: '2024-01-01 10:02:00', gacha_type: '301', rank_type: '4', name: 'Xiangling' },
    { id: '1004', time: '2024-01-01 10:03:00', gacha_type: '301', rank_type: '3', name: 'Sharpshooter' },
  ];
  const res = computePityFromRecords(records, 'genshin');
  assert.equal(res.charPity, 2); // 2 lần roll sau Diluc
  assert.equal(res.lastChar5, 'Diluc');
  assert.equal(res.charGuaranteed, true);
  assert.equal(res.weaponPity, 0);
  assert.equal(res.totalWishes, 4);
});

test('computePityFromRecords: Genshin 5★ trúng rate-up -> charGuaranteed = false', () => {
  const records = [
    { id: '2001', time: '2024-02-01 10:00:00', gacha_type: '301', rank_type: '5', name: 'Raiden Shogun' },
    { id: '2002', time: '2024-02-01 10:01:00', gacha_type: '301', rank_type: '3', name: 'Debate Club' },
  ];
  const res = computePityFromRecords(records, 'genshin');
  assert.equal(res.charPity, 1);
  assert.equal(res.lastChar5, 'Raiden Shogun');
  assert.equal(res.charGuaranteed, false);
});

test('computePityFromRecords: Genshin chưa từng nổ 5★', () => {
  const records = [
    { id: '3001', time: '2024-03-01 10:00:00', gacha_type: '301', rank_type: '3', name: 'Harbinger of Dawn' },
    { id: '3002', time: '2024-03-01 10:01:00', gacha_type: '301', rank_type: '4', name: 'Bennett' },
    { id: '3003', time: '2024-03-01 10:02:00', gacha_type: '301', rank_type: '3', name: 'Slingshot' },
  ];
  const res = computePityFromRecords(records, 'genshin');
  assert.equal(res.charPity, 3);
  assert.equal(res.lastChar5, null);
  assert.equal(res.charGuaranteed, false);
});

test('computePityFromRecords: Genshin banner vũ khí 302', () => {
  const records = [
    { id: '4001', time: '2024-04-01 10:00:00', gacha_type: '302', rank_type: '5', name: 'Staff of Homa' },
    { id: '4002', time: '2024-04-01 10:01:00', gacha_type: '302', rank_type: '3', name: 'Raven Bow' },
    { id: '4003', time: '2024-04-01 10:02:00', gacha_type: '302', rank_type: '3', name: 'Black Tassel' },
  ];
  const res = computePityFromRecords(records, 'genshin');
  assert.equal(res.weaponPity, 2);
  assert.equal(res.lastWeapon5, 'Staff of Homa');
  assert.equal(res.charPity, 0);
});

test('computePityFromRecords: HSR 5★ lệch rate (Standard Bronya) -> charGuaranteed = true', () => {
  const records = [
    { id: '5001', time: '2024-05-01 10:00:00', gacha_type: '11', rank_type: '3', name: 'Arrows' },
    { id: '5002', time: '2024-05-01 10:01:00', gacha_type: '11', rank_type: '5', name: 'Bronya' }, // Standard HSR
    { id: '5003', time: '2024-05-01 10:02:00', gacha_type: '11', rank_type: '4', name: 'March 7th' },
    { id: '5004', time: '2024-05-01 10:03:00', gacha_type: '11', rank_type: '3', name: 'Cornucopia' },
    { id: '5005', time: '2024-05-01 10:04:00', gacha_type: '11', rank_type: '3', name: 'Passkey' },
  ];
  const res = computePityFromRecords(records, 'hsr');
  assert.equal(res.charPity, 3); // 3 lần sau Bronya
  assert.equal(res.lastChar5, 'Bronya');
  assert.equal(res.charGuaranteed, true);
  assert.equal(res.weaponPity, 0);
});

test('computePityFromRecords: HSR 5★ trúng rate-up (Acheron) -> charGuaranteed = false', () => {
  const records = [
    { id: '6001', time: '2024-06-01 10:00:00', gacha_type: '11', rank_type: '5', name: 'Acheron' },
    { id: '6002', time: '2024-06-01 10:01:00', gacha_type: '11', rank_type: '3', name: 'Reminiscence' },
  ];
  const res = computePityFromRecords(records, 'hsr');
  assert.equal(res.charPity, 1);
  assert.equal(res.lastChar5, 'Acheron');
  assert.equal(res.charGuaranteed, false);
});

test('computePityFromRecords: HSR chưa từng nổ 5★', () => {
  const records = [
    { id: '7001', time: '2024-07-01 10:00:00', gacha_type: '11', rank_type: '3', name: 'Adversarial' },
    { id: '7002', time: '2024-07-01 10:01:00', gacha_type: '11', rank_type: '4', name: 'Gallagher' },
  ];
  const res = computePityFromRecords(records, 'hsr');
  assert.equal(res.charPity, 2);
  assert.equal(res.lastChar5, null);
  assert.equal(res.charGuaranteed, false);
});

test('computePityFromRecords: HSR Nón Ánh Sáng (banner 12)', () => {
  const records = [
    { id: '8001', time: '2024-08-01 10:00:00', gacha_type: '12', rank_type: '5', name: 'Along the Passing Shore' },
    { id: '8002', time: '2024-08-01 10:01:00', gacha_type: '12', rank_type: '3', name: 'Loop' },
  ];
  const res = computePityFromRecords(records, 'hsr');
  assert.equal(res.weaponPity, 1);
  assert.equal(res.lastWeapon5, 'Along the Passing Shore');
  assert.equal(res.charPity, 0);
});

test('fetchLivePity & getPityData: HSR live fetch, dừng khi gặp 5★ và cache kết quả', async () => {
  let callCount = 0;
  const mockTransport = {
    routes: {},
    data: async (op, options) => {
      callCount++;
      if (op === 'authkey') {
        assert.equal(options.body.game_biz, 'hkrpg_global');
        return { authkey: 'mock_hsr_authkey%3D%3D' };
      }
      if (op === 'hsr_wishes') {
        const type = options.params.gacha_type;
        if (type === '11') {
          // Banner nhân vật: trả 1 trang chứa 5 sao Feixiao ở vị trí 2, theo sau là 3 pulls 3 sao
          return {
            list: [
              { id: '9005', rank_type: '3', gacha_type: '11', name: 'A' },
              { id: '9004', rank_type: '3', gacha_type: '11', name: 'B' },
              { id: '9003', rank_type: '3', gacha_type: '11', name: 'C' },
              { id: '9002', rank_type: '5', gacha_type: '11', name: 'Feixiao' }, // Gặp 5 sao -> dừng
              { id: '9001', rank_type: '3', gacha_type: '11', name: 'D' },
            ],
          };
        }
        if (type === '12') {
          return {
            list: [
              { id: '9102', rank_type: '3', gacha_type: '12', name: 'E' },
              { id: '9101', rank_type: '5', gacha_type: '12', name: 'I Venture Forth to Hunt' },
            ],
          };
        }
      }
      throw new Error(`Unexpected op: ${op}`);
    },
  };

  const client = {
    cookies: { cookie_token_v2: 'mock_token', account_id_v2: '12345' },
    roles: [{ uid: '800000001', server: 'prod_official_asia', game: 'hsr', gameBiz: 'hkrpg_global' }],
    selected: { uid: '800000001', server: 'prod_official_asia' },
    transport: mockTransport,
  };

  const res1 = await getPityData(client, '800000001', 'hsr');
  assert.equal(res1.ok, true);
  assert.equal(res1.found, true);
  assert.equal(res1.source, 'api');
  assert.equal(res1.charPity, 3); // 3 lần sau Feixiao (id 9003, 9004, 9005)
  assert.equal(res1.lastChar5, 'Feixiao');
  assert.equal(res1.charGuaranteed, false);
  assert.equal(res1.weaponPity, 1);
  assert.equal(res1.lastWeapon5, 'I Venture Forth to Hunt');

  // Lần 2: Phải đọc từ cache, không gọi thêm request nào tới transport
  const callsBefore = callCount;
  const res2 = await getPityData(client, '800000001', 'hsr');
  assert.equal(callCount, callsBefore); // 0 extra calls
  assert.equal(res2.charPity, 3);
});

test('getPityData: API lỗi -> trả fallback an toàn, không throw', async () => {
  const failingTransport = {
    routes: {},
    data: async () => {
      throw new Error('Network error or rate limited');
    },
  };

  const client = {
    cookies: { cookie_token_v2: 'bad_token' },
    roles: [{ uid: '999999999', server: 'os_asia' }],
    transport: failingTransport,
  };

  // Không có file disk cho UID 999999999
  const res = await getPityData(client, '999999999', 'genshin');
  assert.equal(res.ok, true);
  assert.equal(res.found, false); // fallback về found: false thay vì văng 500 error
});
