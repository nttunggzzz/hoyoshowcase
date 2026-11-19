import * as core from '../hoyolab/client.mjs';
import * as collector from '../collection/collector.mjs';
import * as hsrCollector from '../collection/hsr-collector.mjs';
import { showcaseModel } from '../models/showcase.mjs';
import { hsrShowcaseModel } from '../models/hsr-showcase.mjs';
import { getPityDataForUid } from '../pity.mjs';
import { HttpError } from '../http.mjs';

/** Session-scoped operations. HTTP validation belongs to app.mjs. */
export async function dispatchApi(pathname, input, c, { publishSnapshot, onPersistenceError }) {
  let result;
  switch (pathname) {
    case '/api/showcase':
      result = await core.showcase(c, String(input.uid));
      break;
    case '/api/login': {
      const account = input.account,
        password = input.password;
      delete input.password;
      delete input.account;
      result = await core.startLogin(
        c,
        account,
        password,
        input.profile || 'sdk',
        input.deviceId ?? null,
      );
      break;
    }
    case '/api/send-otp':
      result = await core.sendOtp(c);
      break;
    case '/api/otp':
      result = await core.submitOtp(c, String(input.code));
      delete input.code;
      break;
    case '/api/captcha':
      result = await core.submitCaptcha(c, input.validation);
      break;
    case '/api/refresh-captcha':
      result = await core.refreshCaptcha(c);
      break;
    case '/api/exchange':
      result = await core.exchange(c);
      break;
    case '/api/cookies':
      result = core.importCookies(c, input.cookies);
      delete input.cookies;
      break;
    case '/api/roles':
      result = await core.getRoles(c, input.route);
      break;
    case '/api/select':
      result = core.selectRole(c, String(input.uid), String(input.server));
      break;
    case '/api/chronicle':
      result = await core.chronicle(c, !!input.detail);
      break;
    case '/api/collector/start': {
      const isHsr =
        input?.game === 'hsr' || c.roles?.find((r) => r.uid === c.selected?.uid)?.game === 'hsr';
      if (isHsr) {
        result = { ok: true, collection: hsrCollector.startHsrCollection(c) };
        c.hsrCollection.promise
          .then((snapshot) => {
            if (snapshot.state === 'complete') return publishSnapshot(snapshot);
          })
          .catch(onPersistenceError);
      } else {
        result = { ok: true, collection: collector.startCollection(c) };
        c.collection.done
          .then((snapshot) => {
            if (snapshot.state === 'complete') return publishSnapshot(snapshot);
          })
          .catch(onPersistenceError);
      }
      break;
    }
    case '/api/collector/status': {
      const isHsr = input?.game === 'hsr' || (c.hsrCollection && !c.collection);
      result = {
        ok: true,
        collection: isHsr ? hsrCollector.hsrCollectionStatus(c) : collector.collectionStatus(c),
      };
      break;
    }
    case '/api/collector/view': {
      const isHsr =
        input?.game === 'hsr' || c.hsrCollection?.snapshot?.schema === 'hsr-battle-chronicle-v1';
      result = {
        ok: true,
        view: isHsr
          ? hsrShowcaseModel(c.hsrCollection?.snapshot)
          : showcaseModel(c.collection?.snapshot),
      };
      break;
    }
    case '/api/collector/export': {
      const isHsr =
        input?.game === 'hsr' || c.hsrCollection?.snapshot?.schema === 'hsr-battle-chronicle-v1';
      result = {
        ok: true,
        snapshot: isHsr ? hsrCollector.exportHsrCollection(c) : collector.exportCollection(c),
      };
      break;
    }
    case '/api/collector/cancel': {
      const isHsr = input?.game === 'hsr' || (c.hsrCollection && !c.collection);
      result = {
        ok: true,
        collection: isHsr ? hsrCollector.cancelHsrCollection(c) : collector.cancelCollection(c),
      };
      break;
    }
    case '/api/authkey':
      result = await core.fetchAuthkey(c);
      break;
    case '/api/import-authkey':
      result = core.importAuthkey(c, input.value, String(input.uid), String(input.server));
      delete input.value;
      break;
    case '/api/sync':
      result = await core.syncWishes(c, String(input.banner), Number(input.maxPages));
      break;
    case '/api/import-backup':
      result = core.importArchive(c, input.backup);
      break;
    case '/api/backup':
      result = { backup: c.archive };
      break;
    case '/api/evidence':
      result = { format: 'genshin-insights-evidence-v1', events: c.transport.audit };
      break;
    case '/api/pity':
      result = await getPityDataForUid(String(input.uid || ''));
      break;
    case '/api/redeem-code':
      result = await core.redeemCode(
        c,
        String(input.cdkey || input.code || ''),
        input.uid ? String(input.uid) : undefined,
        input.server ? String(input.server) : undefined,
      );
      break;
    case '/api/reset':
      core.resetCredentials(c);
      c.transport.audit = [];
      result = { ok: true, cleared: true };
      break;
    default:
      throw new HttpError(404, 'Operation không được hỗ trợ.');
  }

  return result;
}
