import { msgs } from '../i18n';
import * as B from './booking';
import type { ID, Outcome, Prefs, Role, State } from './types';

export type Action =
  | { type: 'book'; sessionId: ID; profileId: ID }
  | { type: 'cancel'; sessionId: ID; profileId: ID }
  | { type: 'joinWaitlist'; sessionId: ID; profileId: ID; autoAccept: boolean }
  | { type: 'leaveWaitlist'; sessionId: ID; profileId: ID }
  | { type: 'claimOffer'; sessionId: ID; profileId: ID }
  | { type: 'declineOffer'; sessionId: ID; profileId: ID }
  | { type: 'simulateCancellation'; sessionId: ID }
  | { type: 'signWaiver'; profileId: ID; signature: string }
  | { type: 'signWaiverAndBook'; sessionId: ID; profileId: ID; signature: string; autoAccept: boolean }
  | { type: 'unfreezeAndBook'; sessionId: ID; profileId: ID; autoAccept: boolean }
  | { type: 'freeze'; profileId: ID; days: number }
  | { type: 'unfreeze'; profileId: ID }
  | { type: 'removeCard'; id: ID }
  | { type: 'buyCredits'; profileId: ID }
  | { type: 'switchProfile'; profileId: ID }
  | { type: 'setBranch'; branchId: ID }
  | { type: 'setPrefs'; prefs: Partial<Prefs> }
  | { type: 'markContacted'; memberId: ID }
  | { type: 'setRole'; role: Role }
  | { type: 'tick' };

const quiet = (state: State): Outcome => ({ state, notices: [] });

function chain(first: Outcome, original: State, then: (s: State) => Outcome): Outcome {
  if (first.state === original) return first; // first step failed
  const second = then(first.state);
  return { state: second.state, notices: [...first.notices, ...second.notices] };
}

export function applyAction(s: State, a: Action, now: number): Outcome {
  switch (a.type) {
    case 'book':
      return B.book(s, a.sessionId, a.profileId, now);
    case 'cancel':
      return B.cancel(s, a.sessionId, a.profileId, now);
    case 'joinWaitlist':
      return B.joinWaitlist(s, a.sessionId, a.profileId, a.autoAccept, now);
    case 'leaveWaitlist':
      return B.leaveWaitlist(s, a.sessionId, a.profileId, now);
    case 'claimOffer':
      return B.claimOffer(s, a.sessionId, a.profileId, now);
    case 'declineOffer':
      return B.declineOffer(s, a.sessionId, a.profileId, now);
    case 'simulateCancellation':
      return B.simulateCancellation(s, a.sessionId, now);
    case 'signWaiver':
      return B.signWaiver(s, a.profileId, a.signature, now);
    case 'signWaiverAndBook':
      return chain(B.signWaiver(s, a.profileId, a.signature, now), s, (next) =>
        B.bookOrWaitlist(next, a.sessionId, a.profileId, a.autoAccept, now),
      );
    case 'unfreezeAndBook':
      return chain(B.unfreeze(s, a.profileId, now), s, (next) =>
        B.bookOrWaitlist(next, a.sessionId, a.profileId, a.autoAccept, now),
      );
    case 'freeze':
      return B.freeze(s, a.profileId, a.days, now);
    case 'unfreeze':
      return B.unfreeze(s, a.profileId, now);
    case 'removeCard':
      return B.removePaymentMethod(s, a.id);
    case 'buyCredits':
      return B.buyCredits(s, a.profileId, now);
    case 'switchProfile':
      return quiet({ ...s, account: { ...s.account, activeProfileId: a.profileId } });
    case 'setBranch':
      return {
        state: { ...s, account: { ...s.account, preferredBranchId: a.branchId } },
        notices: [{ kind: 'info', text: msgs(s).notice.branchSet(B.branchName(s, a.branchId)) }],
      };
    case 'setPrefs':
      return quiet({ ...s, prefs: { ...s.prefs, ...a.prefs } });
    case 'markContacted':
      return {
        state: { ...s, contacted: { ...s.contacted, [a.memberId]: now } },
        notices: [{ kind: 'success', text: msgs(s).notice.contacted(B.personName(s, a.memberId)) }],
      };
    case 'setRole':
      return quiet({ ...s, role: a.role });
    case 'tick':
      return B.tick(s, now);
  }
}
