import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Bot,
  Send,
  BookOpen,
  ScrollText,
  Trophy,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Layers,
  RotateCcw,
  AlertTriangle,
  X,
  Plus,
  Minus,
  Eye,
  MessageSquare,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

// ============================================================================
// FIREBASE INITIALIZATION (WITH AUTOMATIC LOCAL FALLBACK)
// ============================================================================
let db = null;
let auth = null;
const FIREBASE_READY = isFirebaseConfigured();

if (FIREBASE_READY) {
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch {
    db = null;
    auth = null;
  }
}

// ============================================================================
// WEB AUDIO SYNTHESIZED CASINO SOUND EFFECTS
// ============================================================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }
  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }
  play(type) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === 'card') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.065);
      } else if (type === 'meld') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.07);
        osc.frequency.setValueAtTime(783.99, now + 0.14);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.29);
      } else if (type === 'unlock') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.09);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'penalty') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(210, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.25);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'win') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const o = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          o.type = 'sine';
          o.connect(g);
          g.connect(this.ctx.destination);
          o.frequency.setValueAtTime(freq, now + idx * 0.09);
          g.gain.setValueAtTime(0.08, now + idx * 0.09);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.32);
          o.start(now + idx * 0.09);
          o.stop(now + idx * 0.09 + 0.34);
        });
      }
    } catch {
      // Ignore restricted audio environments
    }
  }
}
const sfx = new SoundEngine();

// ============================================================================
// END-TO-END ENCRYPTION (PBKDF2-SHA256 + AES-256-GCM)
// ============================================================================
const enc = new TextEncoder();
const dec = new TextDecoder();

function generateSecretKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (b) => chars[b % chars.length]).join('');
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

async function deriveRoomKey(secretKey, roomCode) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretKey.trim().toUpperCase()),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(`8CWF-SALT-${roomCode.trim().toUpperCase()}`),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function computeSafetyCode(secretKey, roomCode) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    enc.encode(`${roomCode.toUpperCase()}::${secretKey.toUpperCase()}`)
  );
  const hex = Array.from(new Uint8Array(digest))
    .slice(0, 6)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

function toBase64(uint8) {
  let bin = '';
  for (let i = 0; i < uint8.length; i++) bin += String.fromCharCode(uint8[i]);
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function encryptJSON(aesKey, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = enc.encode(JSON.stringify(obj));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plain);
  return {
    iv: toBase64(iv),
    ct: toBase64(new Uint8Array(cipher)),
  };
}

async function decryptJSON(aesKey, payload) {
  const iv = fromBase64(payload.iv);
  const ct = fromBase64(payload.ct);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ct);
  return JSON.parse(dec.decode(plain));
}

// ============================================================================
// CARD & CUSTOM RULES ENGINE (8 CARD WITH FRIENDS v2 — COMBO TURN ENABLED)
// ============================================================================
const SUITS = ['S', 'H', 'D', 'C'];
const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_RED = { S: false, H: true, D: true, C: false };
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const RANK_LABEL = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}${suit}`, rank, suit });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function getNextJokerRank(indicatorRank) {
  return indicatorRank === 13 ? 1 : indicatorRank + 1;
}

function isWildJoker(card, jokerRank) {
  return card && card.rank === jokerRank;
}

function cardPoints(card, jokerRank) {
  
  return 1;
}



function cardLabel(card) {
  return `${RANK_LABEL[card.rank]}${SUIT_SYMBOL[card.suit]}`;
}

function sortHand(cards, jokerRank) {
  const suitOrder = { S: 0, H: 1, C: 2, D: 3 };
  return [...cards].sort((a, b) => {
    const ja = isWildJoker(a, jokerRank) ? 1 : 0;
    const jb = isWildJoker(b, jokerRank) ? 1 : 0;
    if (ja !== jb) return ja - jb;
    if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
    return a.rank - b.rank;
  });
}

function validateAndResolveMeld(cards, jokerRank) {
  if (!cards || cards.length < 3) return { valid: false, reason: 'Minimum 3 cards required.' };

  const jokers = cards.filter((c) => isWildJoker(c, jokerRank));
  const naturals = cards.filter((c) => !isWildJoker(c, jokerRank));

  // 1. Try SET (3 or 4 cards, same rank, distinct suits)
  if (cards.length <= 4 || jokers.length > 0) {
    if (naturals.length === 0) {
      return {
        valid: true,
        type: 'set',
        setRank: jokerRank,
        slots: cards.map((c) => ({ card: c, resolvedRank: jokerRank, suit: c.suit, isJoker: true })),
      };
    }
    const targetRank = naturals[0].rank;
    const sameRank = naturals.every((c) => c.rank === targetRank);
    const uniqueSuits = new Set(naturals.map((c) => c.suit)).size === naturals.length;
    if (sameRank && uniqueSuits) {
      return {
        valid: true,
        type: 'set',
        setRank: targetRank,
        slots: [
          ...naturals.map((c) => ({ card: c, resolvedRank: targetRank, suit: c.suit, isJoker: false })),
          ...jokers.map((c) => ({ card: c, resolvedRank: targetRank, suit: null, isJoker: true })),
        ],
      };
    }
  }

  // 2. Try SEQUENCE (same suit, consecutive ranks, Ace Low 1-2-3 OR Ace High Q-K-A, NO wrap-around)
  if (naturals.length === 0) {
    const start = Math.max(1, 14 - cards.length + 1);
    return {
      valid: true,
      type: 'sequence',
      suit: 'S',
      slots: cards.map((c, idx) => ({ card: c, resolvedRank: start + idx, suit: 'S', isJoker: true })),
    };
  }

  const suit = naturals[0].suit;
  if (!naturals.every((c) => c.suit === suit)) {
    return { valid: false, reason: 'Sequence cards must share the same suit.' };
  }

  const aceOptions = naturals.some((c) => c.rank === 1) ? [1, 14] : [1];
  for (const aceVal of aceOptions) {
    const mapped = naturals.map((c) => ({
      card: c,
      val: c.rank === 1 ? aceVal : c.rank,
    }));
    const vals = mapped.map((m) => m.val);
    if (new Set(vals).size !== vals.length) continue;

    mapped.sort((a, b) => a.val - b.val);
    const minV = mapped[0].val;
    const maxV = mapped[mapped.length - 1].val;
    const span = maxV - minV + 1;

    if (span > cards.length) continue;

    const internalGaps = span - mapped.length;
    if (internalGaps > jokers.length) continue;

    const extraJokers = jokers.length - internalGaps;
    const maxUp = 14 - maxV;
    const addRight = Math.min(extraJokers, maxUp);
    const addLeft = extraJokers - addRight;
    const startRank = minV - addLeft;
    const endRank = maxV + addRight;

    if (startRank < 1 || endRank > 14) continue;

    const natMap = new Map(mapped.map((m) => [m.val, m.card]));
    let jIdx = 0;
    const slots = [];
    for (let r = startRank; r <= endRank; r++) {
      if (natMap.has(r)) {
        slots.push({ card: natMap.get(r), resolvedRank: r, suit, isJoker: false });
      } else {
        slots.push({ card: jokers[jIdx++], resolvedRank: r, suit, isJoker: true });
      }
    }
    return { valid: true, type: 'sequence', suit, slots };
  }

  return { valid: false, reason: 'Invalid sequence or set.' };
}

function validateAndApplyPush(meld, pushCards, direction, jokerRank) {
  if (!pushCards || pushCards.length === 0) {
    return { valid: false, reason: 'Select at least 1 card to push.' };
  }

  if (meld.type === 'set') {
    if (meld.slots.length + pushCards.length > 4) {
      return { valid: false, reason: 'A Set cannot exceed 4 cards.' };
    }
    const existingSuits = new Set(meld.slots.filter((s) => !s.isJoker).map((s) => s.suit));
    const newSlots = [...meld.slots];
    for (const c of pushCards) {
      if (isWildJoker(c, jokerRank)) {
        newSlots.push({ card: c, resolvedRank: meld.setRank, suit: null, isJoker: true });
      } else {
        if (c.rank !== meld.setRank) {
          return { valid: false, reason: `Card ${cardLabel(c)} does not match Set rank ${RANK_LABEL[meld.setRank]}.` };
        }
        if (existingSuits.has(c.suit)) {
          return { valid: false, reason: `Duplicate suit ${SUIT_SYMBOL[c.suit]} in Set.` };
        }
        existingSuits.add(c.suit);
        newSlots.push({ card: c, resolvedRank: meld.setRank, suit: c.suit, isJoker: false });
      }
    }
    return { valid: true, updatedMeld: { ...meld, slots: newSlots } };
  }

  const suit = meld.suit;
  const existingRanks = new Set(meld.slots.map((s) => s.resolvedRank));
  const minRank = meld.slots[0].resolvedRank;
  const maxRank = meld.slots[meld.slots.length - 1].resolvedRank;

  const natPush = pushCards.filter((c) => !isWildJoker(c, jokerRank));
  if (!natPush.every((c) => c.suit === suit)) {
    return { valid: false, reason: `Pushed cards must match sequence suit ${SUIT_SYMBOL[suit]}.` };
  }

  const count = pushCards.length;
  let targetRanks = [];
  if (direction === 'left') {
    const newMin = minRank - count;
    if (newMin < 1) return { valid: false, reason: 'Cannot push below Ace Low (A).' };
    for (let r = newMin; r < minRank; r++) targetRanks.push(r);
  } else {
    const newMax = maxRank + count;
    if (newMax > 14) return { valid: false, reason: 'Cannot push above Ace High (A).' };
    for (let r = maxRank + 1; r <= newMax; r++) targetRanks.push(r);
  }

  const targetSet = new Set(targetRanks);
  const usedRanks = new Map();
  const jokers = pushCards.filter((c) => isWildJoker(c, jokerRank));

  for (const c of natPush) {
    let resolved = c.rank;
    if (c.rank === 1) {
      if (targetSet.has(14)) resolved = 14;
      else if (targetSet.has(1)) resolved = 1;
      else return { valid: false, reason: 'Ace cannot be pushed at this boundary.' };
    }
    if (existingRanks.has(resolved)) {
      return { valid: false, reason: `Rank ${RANK_LABEL[resolved]} is already occupied in this sequence.` };
    }
    if (!targetSet.has(resolved) || usedRanks.has(resolved)) {
      return { valid: false, reason: `Card ${cardLabel(c)} does not extend the sequence cleanly.` };
    }
    usedRanks.set(resolved, c);
  }

  let jIdx = 0;
  const addedSlots = targetRanks.map((r) => {
    if (usedRanks.has(r)) {
      return { card: usedRanks.get(r), resolvedRank: r, suit, isJoker: false };
    }
    return { card: jokers[jIdx++], resolvedRank: r, suit, isJoker: true };
  });

  const combinedSlots =
    direction === 'left' ? [...addedSlots, ...meld.slots] : [...meld.slots, ...addedSlots];

  return { valid: true, updatedMeld: { ...meld, slots: combinedSlots } };
}

// ============================================================================
// COMBO-CAPABLE SMART AI BOT SOLVER
// ============================================================================
function findBestBotMeld(hand, jokerRank) {
  const candidates = [];
  const n = hand.length;
  for (let size = Math.min(4, n); size >= 3; size--) {
    const combo = (start, acc) => {
      if (acc.length === size) {
        const res = validateAndResolveMeld(acc, jokerRank);
        if (res.valid) {
          const jokerCount = acc.filter((c) => isWildJoker(c, jokerRank)).length;
          const pts = acc.reduce((s, c) => s + cardPoints(c, jokerRank), 0);
          candidates.push({ cards: acc, res, score: pts * 10 - jokerCount * 25 + size * 8 });
        }
        return;
      }
      for (let i = start; i < n; i++) {
        combo(i + 1, [...acc, hand[i]]);
      }
    };
    combo(0, []);
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

function findBestBotPush(hand, boardMelds, jokerRank) {
  for (let mIdx = 0; mIdx < boardMelds.length; mIdx++) {
    const meld = boardMelds[mIdx];
    for (const card of hand) {
      if (meld.type === 'set') {
        const res = validateAndApplyPush(meld, [card], 'set', jokerRank);
        if (res.valid) return { meldIndex: mIdx, cards: [card], direction: 'set', updatedMeld: res.updatedMeld };
      } else {
        for (const dir of ['right', 'left']) {
          const res = validateAndApplyPush(meld, [card], dir, jokerRank);
          if (res.valid) return { meldIndex: mIdx, cards: [card], direction: dir, updatedMeld: res.updatedMeld };
        }
      }
    }
  }
  return null;
}

function chooseBotDiscard(hand, jokerRank) {
  const bestMeld = findBestBotMeld(hand, jokerRank);
  const protectedIds = new Set(bestMeld ? bestMeld.cards.map((c) => c.id) : []);

  const scored = hand.map((card) => {
    if (isWildJoker(card, jokerRank)) return { card, dropScore: -1000 };
    let score = cardPoints(card, jokerRank) * 2;
    if (protectedIds.has(card.id)) score -= 200;
    for (const other of hand) {
      if (other.id === card.id || isWildJoker(other, jokerRank)) continue;
      if (other.rank === card.rank) score -= 12;
      if (other.suit === card.suit && Math.abs(other.rank - card.rank) <= 2) score -= 14;
    }
    return { card, dropScore: score };
  });
  scored.sort((a, b) => b.dropScore - a.dropScore);
  return scored[0].card;
}

// ============================================================================
// UI SUB-COMPONENTS
// ============================================================================
function PlayingCard({
  card,
  jokerRank,
  selected = false,
  small = false,
  resolvedRank = null,
  onClick,
  style,
  className = '',
}) {
  if (!card) return null;
  const isJoker = isWildJoker(card, jokerRank);
  const isRed = SUIT_RED[card.suit];

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`relative select-none rounded-xl border text-left transition-all duration-200 ease-out flex flex-col justify-between shrink-0
        ${small ? 'w-11 h-16 p-1 text-xs' : 'w-16 h-24 sm:w-[74px] sm:h-[108px] p-1.5 sm:p-2'}
        ${
          selected
            ? '-translate-y-4 border-amber-400 ring-2 ring-amber-400/70 shadow-[0_12px_28px_rgba(245,158,11,0.35)] bg-gradient-to-b from-amber-50 to-white'
            : 'border-stone-300/90 bg-gradient-to-b from-white to-stone-100 hover:-translate-y-1.5 shadow-[0_6px_14px_rgba(0,0,0,0.45)]'
        }
        ${className}`}
    >
      <div className={`flex flex-col leading-none font-bold ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
        <span className={small ? 'text-[11px]' : 'text-sm sm:text-base'}>{RANK_LABEL[card.rank]}</span>
        <span className={small ? 'text-[11px]' : 'text-xs sm:text-sm'}>{SUIT_SYMBOL[card.suit]}</span>
      </div>

      <div className={`self-center leading-none ${isRed ? 'text-rose-600' : 'text-slate-900'} ${small ? 'text-base' : 'text-2xl sm:text-3xl'}`}>
        {SUIT_SYMBOL[card.suit]}
      </div>

      {isJoker && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full joker-shimmer text-[8px] sm:text-[9px] font-black tracking-wider text-slate-950 shadow border border-amber-200 whitespace-nowrap">
          {resolvedRank ? `JOKER→${RANK_LABEL[resolvedRank]}` : 'JOKER'}
        </div>
      )}

      <div className={`self-end rotate-180 leading-none font-bold ${isRed ? 'text-rose-600' : 'text-slate-900'} ${small ? 'text-[10px]' : 'text-xs'}`}>
        {RANK_LABEL[card.rank]}
      </div>
    </button>
  );
}

function VideoSeatTile({ player, stream, isTurn, isMe, score, pointLimit, activity, cardCount }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const pct = Math.min(100, Math.round((score / Math.max(1, pointLimit)) * 100));

  return (
    <div
      className={`relative rounded-2xl border backdrop-blur-md p-2 transition-all duration-300 w-36 sm:w-44
        ${
          isTurn
            ? 'border-amber-400 bg-emerald-950/90 animate-turn-ring'
            : 'border-white/10 bg-black/40'
        }`}
    >
      <div className="relative h-20 sm:h-24 w-full rounded-xl overflow-hidden bg-gradient-to-br from-emerald-950 to-slate-950 flex items-center justify-center border border-white/10">
        {stream ? (
          <video ref={videoRef} autoPlay playsInline muted={isMe} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-sm">
              {player.isBot ? <Bot className="w-5 h-5" /> : player.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-[10px] text-emerald-200/70">
              {player.isBot ? 'AI Bot' : 'Camera Off'}
            </span>
          </div>
        )}

        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/70 text-[10px] font-bold text-amber-300 border border-white/10">
          {cardCount} cards
        </div>

        {activity && (
          <div className="absolute bottom-1.5 left-1.5 right-1.5 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-bold text-center truncate shadow">
            {activity}
          </div>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className="font-semibold text-amber-50 truncate max-w-[90px]">
          {player.name} {isMe ? '(You)' : ''}
        </span>
        <span className="font-mono text-[11px] text-amber-300 font-bold">
          {score}/{pointLimit}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct >= 80 ? 'bg-rose-500' : pct >= 50 ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APPLICATION (ONLINE + INSTANT LOCAL FALLBACK)
// ============================================================================
export default function App() {
  const [user, setUser] = useState({ uid: 'local-host' });
  const [isLocalMode, setIsLocalMode] = useState(!FIREBASE_READY);
  const [screen, setScreen] = useState('landing');
  const [playerName, setPlayerName] = useState('Player 1');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [secretKeyInput, setSecretKeyInput] = useState('');

  const [limitMode, setLimitMode] = useState('100');
  const [customLimit, setCustomLimit] = useState(75);

  const [roomCode, setRoomCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [aesKey, setAesKey] = useState(null);
  const [safetyCode, setSafetyCode] = useState('');
  const [rawCipherPreview, setRawCipherPreview] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState('');

  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [selectedMeldIdx, setSelectedMeldIdx] = useState(null);
  const [botActivity, setBotActivity] = useState({});

  const [showRules, setShowRules] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatText, setChatText] = useState('');
  const [soundOn, setSoundOn] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  const [localStream, setLocalStream] = useState(null);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [remoteStreams] = useState({});

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? '' : cur)), 3200);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('room');
    const hashKey = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('key');
    if (r) setRoomCodeInput(r.toUpperCase());
    if (hashKey) setSecretKeyInput(hashKey.toUpperCase());

    if (!FIREBASE_READY || !auth) {
      setIsLocalMode(true);
      setUser({ uid: 'local-host' });
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        setIsLocalMode(true);
        setUser({ uid: 'local-host' });
      }
    }, 2000);

    signInAnonymously(auth).catch(() => {
      settled = true;
      setIsLocalMode(true);
      setUser({ uid: 'local-host' });
    });

    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        settled = true;
        clearTimeout(timer);
        setUser(u);
        setIsLocalMode(false);
      }
    });

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  useEffect(() => {
    sfx.enabled = soundOn;
  }, [soundOn]);

  const writeEncryptedRoom = useCallback(
    async (code, keyObj, nextState, forceLocal = false) => {
      if (keyObj) {
        const encrypted = await encryptJSON(keyObj, nextState);
        setRawCipherPreview(encrypted);
        if (!forceLocal && !isLocalMode && db) {
          await setDoc(doc(db, 'rooms_8cwf', code), { encrypted, updatedAt: Date.now() }, { merge: true });
          return;
        }
      }
      setRoomState(nextState);
    },
    [isLocalMode]
  );

  useEffect(() => {
    if (isLocalMode || !roomCode || !aesKey || !db) return;
    const unsub = onSnapshot(doc(db, 'rooms_8cwf', roomCode), async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (!data?.encrypted) return;
      setRawCipherPreview(data.encrypted);
      try {
        const decrypted = await decryptJSON(aesKey, data.encrypted);
        setRoomState(decrypted);
        if (['playing', 'round_over', 'match_over'].includes(decrypted.status)) {
          setScreen('game');
        } else {
          setScreen('lobby');
        }
      } catch {
        setErrorMsg('Invalid Secret Key! Unable to decrypt this room.');
        setRoomCode('');
        setAesKey(null);
        setScreen('landing');
      }
    });
    return () => unsub();
  }, [isLocalMode, roomCode, aesKey]);

  const toggleCamera = async () => {
    try {
      if (!localStream) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        setCamOn(true);
        setMicOn(true);
        showToast('Camera & Mic enabled for Live Table.');
      } else {
        localStream.getVideoTracks().forEach((t) => (t.enabled = !camOn));
        setCamOn(!camOn);
      }
    } catch {
      showToast('Camera/Mic permission denied or unavailable.');
    }
  };

  const toggleMic = async () => {
    try {
      if (!localStream) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        setLocalStream(stream);
        setMicOn(true);
        setCamOn(false);
      } else {
        localStream.getAudioTracks().forEach((t) => (t.enabled = !micOn));
        setMicOn(!micOn);
      }
    } catch {
      showToast('Microphone permission denied.');
    }
  };

  useEffect(() => {
    return () => {
      if (localStream) localStream.getTracks().forEach((t) => t.stop());
    };
  }, [localStream]);

  const resolvedPointLimit = useMemo(() => {
    if (limitMode === '50') return 50;
    if (limitMode === '100') return 100;
    return Math.min(1000, Math.max(10, Number(customLimit) || 75));
  }, [limitMode, customLimit]);

  const buildNewRoundState = (baseState) => {
    const deck = createDeck();
    const hands = {};
    baseState.players.forEach((p) => {
      hands[p.id] = deck.splice(0, 8);
    });
    const indicatorCard = deck.pop();
    const jokerRank = getNextJokerRank(indicatorCard.rank);
    const nextRound = (baseState.roundNumber || 0) + 1;

    return {
      ...baseState,
      status: 'playing',
      roundNumber: nextRound,
      hands,
      indicatorCard,
      jokerRank,
      unopenPile: deck,
      openPile: [],
      boardMelds: [],
      openedPlayers: [],
      turnIndex: (nextRound - 1) % 4,
      turnsCompleted: 0,
      turnPhase: 'action',
      comboActionsThisTurn: 0,
      lastDiscardedCardId: null,
      reshuffleCount: 0,
      roundSummary: null,
      actionLog: [
        `Round ${nextRound} started! Indicator: ${cardLabel(indicatorCard)} → Wild Joker: ${RANK_LABEL[jokerRank]}. Round 1 Meld Lock active (0/4).`,
        ...(baseState.actionLog || []),
      ].slice(0, 50),
    };
  };

  const handleQuickPlayBots = async () => {
    setErrorMsg('');
    const name = playerName.trim() || 'Player 1';
    const code = generateRoomCode();
    const secret = generateSecretKey();
    const derived = await deriveRoomKey(secret, code);
    const safety = await computeSafetyCode(secret, code);
    const myId = user?.uid || 'local-host';

    const base = {
      roomCode: code,
      hostId: myId,
      status: 'lobby',
      pointLimit: resolvedPointLimit,
      roundNumber: 0,
      players: [
        { id: myId, name, isBot: false, score: 0 },
        { id: 'bot-1', name: 'Aarav (Bot)', isBot: true, score: 0 },
        { id: 'bot-2', name: 'Priya (Bot)', isBot: true, score: 0 },
        { id: 'bot-3', name: 'Rohan (Bot)', isBot: true, score: 0 },
      ],
      chat: [],
      actionLog: [`Quick Match started (Limit: ${resolvedPointLimit} pts) with AES-256-GCM E2EE.`],
    };

    const dealt = buildNewRoundState(base);
    setIsLocalMode(true);
    setRoomCode(code);
    setSecretKey(secret);
    setAesKey(derived);
    setSafetyCode(safety);
    sfx.play('card');
    await writeEncryptedRoom(code, derived, dealt, true);
    setScreen('game');
  };

  const handleCreateRoom = async () => {
    setErrorMsg('');
    const name = playerName.trim() || 'Player 1';
    const code = generateRoomCode();
    const secret = generateSecretKey();
    const derived = await deriveRoomKey(secret, code);
    const safety = await computeSafetyCode(secret, code);
    const myId = user?.uid || 'local-host';

    const initialState = {
      roomCode: code,
      hostId: myId,
      status: 'lobby',
      pointLimit: resolvedPointLimit,
      roundNumber: 0,
      players: [{ id: myId, name, isBot: false, score: 0 }],
      chat: [],
      actionLog: [`Room ${code} created with AES-256-GCM E2EE (Limit: ${resolvedPointLimit} pts).`],
    };

    setRoomCode(code);
    setSecretKey(secret);
    setAesKey(derived);
    setSafetyCode(safety);
    await writeEncryptedRoom(code, derived, initialState);
    setScreen('lobby');
  };

  const handleJoinRoom = async () => {
    setErrorMsg('');
    if (!FIREBASE_READY || !db) {
      setErrorMsg('Online Join requires Firebase config in src/firebaseConfig.js. Use Quick Play vs Bots to play offline!');
      return;
    }
    const code = roomCodeInput.trim().toUpperCase();
    const secret = secretKeyInput.trim().toUpperCase();
    const name = playerName.trim() || 'Player';
    if (!code || !secret) {
      setErrorMsg('Enter Room Code and Secret Key.');
      return;
    }

    const snap = await getDoc(doc(db, 'rooms_8cwf', code));
    if (!snap.exists()) {
      setErrorMsg('Room not found. Check the 6-character code.');
      return;
    }

    try {
      const derived = await deriveRoomKey(secret, code);
      const decrypted = await decryptJSON(derived, snap.data().encrypted);
      const safety = await computeSafetyCode(secret, code);
      const alreadyIn = decrypted.players.some((p) => p.id === user.uid);
      if (!alreadyIn) {
        if (decrypted.players.length >= 4) {
          setErrorMsg('Room is full (4/4 players).');
          return;
        }
        const nextState = {
          ...decrypted,
          players: [...decrypted.players, { id: user.uid, name, isBot: false, score: 0 }],
          actionLog: [`${name} joined the encrypted room.`, ...(decrypted.actionLog || [])].slice(0, 40),
        };
        await writeEncryptedRoom(code, derived, nextState);
      }
      setIsLocalMode(false);
      setRoomCode(code);
      setSecretKey(secret);
      setAesKey(derived);
      setSafetyCode(safety);
    } catch {
      setErrorMsg('Wrong Secret Key! Unable to decrypt this room.');
    }
  };

  const handleUpdateLobbyLimit = async (newLimit) => {
    if (!roomState || !aesKey || roomState.hostId !== user?.uid) return;
    const clamped = Math.min(1000, Math.max(10, Number(newLimit) || 75));
    await writeEncryptedRoom(roomCode, aesKey, {
      ...roomState,
      pointLimit: clamped,
      actionLog: [`Host updated match limit to ${clamped} points.`, ...roomState.actionLog].slice(0, 40),
    });
  };

  const handleFillBots = async () => {
    if (!roomState || !aesKey) return;
    const botNames = ['Aarav (Bot)', 'Priya (Bot)', 'Rohan (Bot)', 'Kavya (Bot)'];
    const players = [...roomState.players];
    let idx = 0;
    while (players.length < 4) {
      players.push({ id: `bot-${Date.now()}-${players.length}`, name: botNames[idx++ % botNames.length], isBot: true, score: 0 });
    }
    await writeEncryptedRoom(roomCode, aesKey, {
      ...roomState,
      players,
      actionLog: ['Empty seats filled with Smart AI Bots.', ...roomState.actionLog].slice(0, 40),
    });
  };

  const startNewRound = useCallback(
    async (baseState) => {
      const dealt = buildNewRoundState(baseState);
      sfx.play('card');
      await writeEncryptedRoom(roomCode, aesKey, dealt);
      setScreen('game');
    },
    [roomCode, aesKey, writeEncryptedRoom]
  );

  const finishRound = useCallback(
    async (state, { type, winnerId = null, offenderId = null, reason = '' }) => {
      const updatedPlayers = state.players.map((p) => {
        let added = 0;
        if (type === 'win') {
          if (p.id !== winnerId) {
            added = (state.hands[p.id] || []).reduce((sum, c) => sum + cardPoints(c, state.jokerRank), 0);
          }
        } else if (type === 'penalty') {
          added = p.id === offenderId ? 8 : 0;
        } else if (type === 'tie') {
          added = 0;
        }
        return { ...p, score: p.score + added, lastRoundAdded: added };
      });

      const someoneEliminated = updatedPlayers.some((p) => p.score >= state.pointLimit);
      let matchWinner = null;
      if (someoneEliminated) {
        matchWinner = [...updatedPlayers].sort((a, b) => a.score - b.score)[0];
      }

      if (type === 'penalty') sfx.play('penalty');
      else sfx.play('win');

      await writeEncryptedRoom(roomCode, aesKey, {
        ...state,
        status: someoneEliminated ? 'match_over' : 'round_over',
        players: updatedPlayers,
        roundSummary: { type, winnerId, offenderId, reason, matchWinner },
        actionLog: [reason, ...state.actionLog].slice(0, 50),
      });
    },
    [roomCode, aesKey, writeEncryptedRoom]
  );

  const myPlayer = roomState?.players?.find((p) => p.id === user?.uid);
  const currentPlayer = roomState?.players?.[roomState?.turnIndex];
  const isMyTurn = roomState?.status === 'playing' && currentPlayer?.id === user?.uid;
  const isRound1Locked = (roomState?.turnsCompleted || 0) < 4;
  const haveIOpened = (roomState?.openedPlayers || []).includes(user?.uid);
  const isComboActive = isMyTurn && roomState?.turnPhase === 'board_play';

  const toggleSelectCard = (cardId) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const handleDiscard = async () => {
    if (!isMyTurn || roomState.turnPhase !== 'action' || selectedCardIds.length !== 1) return;
    const cardId = selectedCardIds[0];
    const myHand = roomState.hands[user.uid] || [];
    const card = myHand.find((c) => c.id === cardId);
    if (!card) return;

    const remainingHand = myHand.filter((c) => c.id !== cardId);
    const nextOpenPile = [...roomState.openPile, card];
    sfx.play('card');
    setSelectedCardIds([]);

    if (remainingHand.length === 0) {
  await finishRound(
    { ...roomState, hands: { ... } },
    { type: 'win', winnerId: user... }
  );
  return;
    }
    

    await writeEncryptedRoom(roomCode, aesKey, {
      ...roomState,
      hands: { ...roomState.hands, [user.uid]: remainingHand },
      openPile: nextOpenPile,
      turnPhase: 'draw',
      lastDiscardedCardId: card.id,
      actionLog: [`${myPlayer.name} discarded ${cardLabel(card)}. Now drawing...`, ...roomState.actionLog].slice(0, 50),
    });
  };

  const handleDraw = async (source) => {
    if (!isMyTurn || roomState.turnPhase !== 'draw') return;

    let unopen = [...roomState.unopenPile];
    let open = [...roomState.openPile];
    let reshuffleCount = roomState.reshuffleCount || 0;
    let drawnCard = null;
    let logPrefix = '';

    if (source === 'open') {
      if (open.length < 2) {
        showToast('No previous Open Card available on Turn 1. Draw from Unopen Pile.');
        return;
      }
      drawnCard = open.splice(open.length - 2, 1)[0];
      logPrefix = `${myPlayer.name} drew previous Open Card (${cardLabel(drawnCard)}).`;
    } else {
      if (unopen.length === 0) {
        if (reshuffleCount === 0 && open.length > 1) {
          const topCard = open.pop();
          unopen = [...open].sort(() => Math.random() - 0.5);
          open = [topCard];
          reshuffleCount = 1;
          showToast('Unopen Pile reshuffled (1/1)! Discards recycled.');
        } else {
          await finishRound(roomState, {
            type: 'tie',
            reason: 'Unopen Pile exhausted twice with no winner — Round Tied (0 points to all)!',
          });
          return;
        }
      }
      drawnCard = unopen.pop();
      logPrefix = `${myPlayer.name} drew from Unopen Pile.`;
    }

    const nextHand = [...(roomState.hands[user.uid] || []), drawnCard];
    const nextTurns = (roomState.turnsCompleted || 0) + 1;
    const unlockedNow = roomState.turnsCompleted === 3 && nextTurns === 4;
    if (unlockedNow) {
      sfx.play('unlock');
      showToast('Round 1 Complete! Melding & Combo Turns unlocked.');
    } else {
      sfx.play('card');
    }

    let extraLogs = [];
    if (unopen.length === 0) {
      if (reshuffleCount === 0 && open.length > 1) {
        const topCard = open.pop();
        unopen = [...open].sort(() => Math.random() - 0.5);
        open = [topCard];
        reshuffleCount = 1;
        extraLogs.push('Unopen Pile reached 0 — automatically reshuffled discards (Reshuffled 1/1).');
      } else {
        await finishRound(
          { ...roomState, hands: { ...roomState.hands, [user.uid]: nextHand }, unopenPile: unopen, openPile: open, reshuffleCount },
          { type: 'tie', reason: 'Unopen Pile exhausted a second time — Round Tied (0 points to all players)!' }
        );
        return;
      }
    }

    await writeEncryptedRoom(roomCode, aesKey, {
      ...roomState,
      hands: { ...roomState.hands, [user.uid]: nextHand },
      unopenPile: unopen,
      openPile: open,
      reshuffleCount,
      turnIndex: (roomState.turnIndex + 1) % 4,
      turnsCompleted: nextTurns,
      turnPhase: 'action',
      comboActionsThisTurn: 0,
      lastDiscardedCardId: null,
      actionLog: [
        ...(unlockedNow ? ['Round 1 complete! Table melding & Combo Turns UNLOCKED.'] : []),
        ...extraLogs,
        logPrefix,
        ...roomState.actionLog,
      ].slice(0, 50),
    });
  };

  const handleMeld = async () => {
    if (!isMyTurn || !['action', 'board_play'].includes(roomState.turnPhase) || isRound1Locked) return;
    if (selectedCardIds.length < 3) {
      showToast('Select at least 3 cards to lay down a Meld.');
      return;
    }

    const myHand = roomState.hands[user.uid] || [];
    const chosen = selectedCardIds.map((id) => myHand.find((c) => c.id === id)).filter(Boolean);
    const result = validateAndResolveMeld(chosen, roomState.jokerRank);
    setSelectedCardIds([]);

    if (!result.valid) {
      await finishRound(roomState, {
        type: 'penalty',
        offenderId: user.uid,
        reason: `PENALTY (+8 pts): ${myPlayer.name} laid down an invalid meld (${result.reason})`,
      });
      return;
    }

    const remainingHand = myHand.filter((c) => !chosen.some((ch) => ch.id === c.id));
    const newMeld = {
      id: `meld-${Date.now()}`,
      ownerId: user.uid,
      ownerName: myPlayer.name,
      type: result.type,
      suit: result.suit || null,
      setRank: result.setRank || null,
      slots: result.slots,
    };

    const nextBoardMelds = [...roomState.boardMelds, newMeld];
    const nextOpened = Array.from(new Set([...(roomState.openedPlayers || []), user.uid]));
    sfx.play('meld');

    if (remainingHand.length === 0) {
      await finishRound(
        { ...roomState, hands: { ...roomState.hands, [user.uid]: remainingHand }, boardMelds: nextBoardMelds, openedPlayers: nextOpened },
        { type: 'win', winnerId: user.uid, reason: `${myPlayer.name} melded out (Mate!) and won Round ${roomState.roundNumber}!` }
      );
      return;
    }

    showToast('Combo Turn Active! Chain another Meld/Push or tap End Turn.');
    await writeEncryptedRoom(roomCode, aesKey, {
      ...roomState,
      hands: { ...roomState.hands, [user.uid]: remainingHand },
      boardMelds: nextBoardMelds,
      openedPlayers: nextOpened,
      turnPhase: 'board_play',
      comboActionsThisTurn: (roomState.comboActionsThisTurn || 0) + 1,
      actionLog: [
        `${myPlayer.name} melded ${chosen.map(cardLabel).join(' ')} (Combo Turn active).`,
        ...roomState.actionLog,
      ].slice(0, 50),
    });
  };

  const handlePush = async (direction) => {
    if (!isMyTurn || !['action', 'board_play'].includes(roomState.turnPhase) || isRound1Locked || !haveIOpened) return;
    if (selectedMeldIdx === null || selectedCardIds.length === 0) return;

    const meld = roomState.boardMelds[selectedMeldIdx];
    const myHand = roomState.hands[user.uid] || [];
    const chosen = selectedCardIds.map((id) => myHand.find((c) => c.id === id)).filter(Boolean);
    const result = validateAndApplyPush(meld, chosen, direction, roomState.jokerRank);

    setSelectedCardIds([]);
    setSelectedMeldIdx(null);

    if (!result.valid) {
      await finishRound(roomState, {
        type: 'penalty',
        offenderId: user.uid,
        reason: `PENALTY (+8 pts): ${myPlayer.name} made an invalid push (${result.reason})`,
      });
      return;
    }

    const remainingHand = myHand.filter((c) => !chosen.some((ch) => ch.id === c.id));
    const nextBoardMelds = roomState.boardMelds.map((m, idx) =>
      idx === selectedMeldIdx ? result.updatedMeld : m
    );
    sfx.play('meld');

    if (remainingHand.length === 0) {
      await finishRound(
        { ...roomState, hands: { ...roomState.hands, [user.uid]: remainingHand }, boardMelds: nextBoardMelds },
        { type: 'win', winnerId: user.uid, reason: `${myPlayer.name} pushed their final card (Mate!) and won Round ${roomState.roundNumber}!` }
      );
      return;
    }

    showToast('Pushed to Board! Chain more moves or tap End Turn.');
    await writeEncryptedRoom(roomCode, aesKey, {
      ...roomState,
      hands: { ...roomState.hands, [user.uid]: remainingHand },
      boardMelds: nextBoardMelds,
      turnPhase: 'board_play',
      comboActionsThisTurn: (roomState.comboActionsThisTurn || 0) + 1,
      actionLog: [
        `${myPlayer.name} pushed ${chosen.map(cardLabel).join(' ')} (${direction.toUpperCase()}) — Combo Turn active.`,
        ...roomState.actionLog,
      ].slice(0, 50),
    });
  };

  const handleEndComboTurn = async () => {
    if (!isMyTurn || roomState.turnPhase !== 'board_play') return;
    setSelectedCardIds([]);
    setSelectedMeldIdx(null);
    sfx.play('card');

    await writeEncryptedRoom(roomCode, aesKey, {
      ...roomState,
      turnIndex: (roomState.turnIndex + 1) % 4,
      turnsCompleted: (roomState.turnsCompleted || 0) + 1,
      turnPhase: 'action',
      comboActionsThisTurn: 0,
      lastDiscardedCardId: null,
      actionLog: [
        `${myPlayer.name} finished their Combo Turn (${roomState.comboActionsThisTurn} board move${roomState.comboActionsThisTurn > 1 ? 's' : ''}).`,
        ...roomState.actionLog,
      ].slice(0, 50),
    });
  };

  useEffect(() => {
    if (!roomState || roomState.status !== 'playing' || !user || roomState.hostId !== user.uid) return;
    const active = roomState.players[roomState.turnIndex];
    if (!active || !active.isBot) return;

    let cancelled = false;

    const runBotTurn = async () => {
      setBotActivity((prev) => ({ ...prev, [active.id]: 'Thinking...' }));
      await new Promise((r) => setTimeout(r, 700));
      if (cancelled) return;

      let workingHand = [...(roomState.hands[active.id] || [])];
      let workingMelds = [...roomState.boardMelds];
      let workingOpened = [...(roomState.openedPlayers || [])];
      const locked = (roomState.turnsCompleted || 0) < 4;
      let comboMoves = [];

      if (!locked) {
        let keepGoing = true;
        while (keepGoing && workingHand.length > 0) {
          keepGoing = false;
          const bestMeld = findBestBotMeld(workingHand, roomState.jokerRank);
          if (bestMeld) {
            setBotActivity((prev) => ({ ...prev, [active.id]: 'Combo Melding...' }));
            await new Promise((r) => setTimeout(r, 600));
            if (cancelled) return;

            const ids = new Set(bestMeld.cards.map((c) => c.id));
            workingHand = workingHand.filter((c) => !ids.has(c.id));
            workingMelds.push({
              id: `meld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              ownerId: active.id,
              ownerName: active.name,
              type: bestMeld.res.type,
              suit: bestMeld.res.suit || null,
              setRank: bestMeld.res.setRank || null,
              slots: bestMeld.res.slots,
            });
            if (!workingOpened.includes(active.id)) workingOpened.push(active.id);
            comboMoves.push(`melded ${bestMeld.cards.map(cardLabel).join(' ')}`);
            sfx.play('meld');
            keepGoing = true;
            continue;
          }

          if (workingOpened.includes(active.id) && workingMelds.length > 0) {
            const pushMove = findBestBotPush(workingHand, workingMelds, roomState.jokerRank);
            if (pushMove) {
              setBotActivity((prev) => ({ ...prev, [active.id]: 'Combo Pushing...' }));
              await new Promise((r) => setTimeout(r, 550));
              if (cancelled) return;

              workingHand = workingHand.filter((c) => c.id !== pushMove.cards[0].id);
              workingMelds = workingMelds.map((m, idx) =>
                idx === pushMove.meldIndex ? pushMove.updatedMeld : m
              );
              comboMoves.push(`pushed ${cardLabel(pushMove.cards[0])}`);
              sfx.play('meld');
              keepGoing = true;
            }
          }
        }

        if (comboMoves.length > 0) {
          setBotActivity((prev) => ({ ...prev, [active.id]: '' }));
          if (workingHand.length === 0) {
            await finishRound(
              {
                ...roomState,
                hands: { ...roomState.hands, [active.id]: workingHand },
                boardMelds: workingMelds,
                openedPlayers: workingOpened,
              },
              { type: 'win', winnerId: active.id, reason: `${active.name} combo-mated (${comboMoves.join(' + ')}) and won Round ${roomState.roundNumber}!` }
            );
            return;
          }

          await writeEncryptedRoom(roomCode, aesKey, {
            ...roomState,
            hands: { ...roomState.hands, [active.id]: workingHand },
            boardMelds: workingMelds,
            openedPlayers: workingOpened,
            turnIndex: (roomState.turnIndex + 1) % 4,
            turnsCompleted: (roomState.turnsCompleted || 0) + 1,
            turnPhase: 'action',
            comboActionsThisTurn: 0,
            actionLog: [`${active.name} Combo Turn: ${comboMoves.join(' → ')}.`, ...roomState.actionLog].slice(0, 50),
          });
          return;
        }
      }

      setBotActivity((prev) => ({ ...prev, [active.id]: 'Discarding...' }));
      const dropCard = chooseBotDiscard(workingHand, roomState.jokerRank);
      const afterDrop = workingHand.filter((c) => c.id !== dropCard.id);
      let open = [...roomState.openPile, dropCard];
      let unopen = [...roomState.unopenPile];
      let reshuffleCount = roomState.reshuffleCount || 0;

      await new Promise((r) => setTimeout(r, 550));
      if (cancelled) return;

      setBotActivity((prev) => ({ ...prev, [active.id]: 'Drawing...' }));
      let drawnCard = null;
      let drawSourceText = 'Unopen Pile';

      if (open.length >= 2) {
        const prevOpen = open[open.length - 2];
        const wantsOpen =
          isWildJoker(prevOpen, roomState.jokerRank) ||
          afterDrop.some((c) => c.rank === prevOpen.rank || (c.suit === prevOpen.suit && Math.abs(c.rank - prevOpen.rank) === 1));
        if (wantsOpen) {
          drawnCard = open.splice(open.length - 2, 1)[0];
          drawSourceText = `Open Pile (${cardLabel(drawnCard)})`;
        }
      }

      if (!drawnCard) {
        if (unopen.length === 0) {
          if (reshuffleCount === 0 && open.length > 1) {
            const top = open.pop();
            unopen = [...open].sort(() => Math.random() - 0.5);
            open = [top];
            reshuffleCount = 1;
          } else {
            setBotActivity((prev) => ({ ...prev, [active.id]: '' }));
            await finishRound(roomState, {
              type: 'tie',
              reason: 'Unopen Pile exhausted twice with no winner — Round Tied (0 points to all)!',
            });
            return;
          }
        }
        drawnCard = unopen.pop();
      }

      const nextHand = [...afterDrop, drawnCard];
      const nextTurns = (roomState.turnsCompleted || 0) + 1;
      setBotActivity((prev) => ({ ...prev, [active.id]: '' }));

      if (unopen.length === 0) {
        if (reshuffleCount === 0 && open.length > 1) {
          const top = open.pop();
          unopen = [...open].sort(() => Math.random() - 0.5);
          open = [top];
          reshuffleCount = 1;
        } else {
          await finishRound(
            { ...roomState, hands: { ...roomState.hands, [active.id]: nextHand }, unopenPile: unopen, openPile: open, reshuffleCount },
            { type: 'tie', reason: 'Unopen Pile exhausted twice — Round Tied (0 points to all)!' }
          );
          return;
        }
      }

      sfx.play('card');
      await writeEncryptedRoom(roomCode, aesKey, {
        ...roomState,
        hands: { ...roomState.hands, [active.id]: nextHand },
        unopenPile: unopen,
        openPile: open,
        reshuffleCount,
        turnIndex: (roomState.turnIndex + 1) % 4,
        turnsCompleted: nextTurns,
        turnPhase: 'action',
        comboActionsThisTurn: 0,
        actionLog: [
          ...(roomState.turnsCompleted === 3 && nextTurns === 4 ? ['Round 1 complete! Table melding & Combo Turns UNLOCKED.'] : []),
          `${active.name} discarded ${cardLabel(dropCard)} & drew from ${drawSourceText}.`,
          ...roomState.actionLog,
        ].slice(0, 50),
      });
    };

    runBotTurn();
    return () => {
      cancelled = true;
    };
  }, [roomState, user, roomCode, aesKey, writeEncryptedRoom, finishRound]);

  const handleSendChat = async (textOverride) => {
    const msg = (textOverride ?? chatText).trim();
    if (!msg || !roomState || !aesKey || !myPlayer) return;
    setChatText('');
    const nextChat = [
      ...(roomState.chat || []),
      { id: Date.now(), sender: myPlayer.name, text: msg, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ].slice(-40);
    await writeEncryptedRoom(roomCode, aesKey, { ...roomState, chat: nextChat });
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}#key=${secretKey}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedLink(true);
    showToast('Encrypted Invite Link copied!');
    setTimeout(() => setCopiedLink(false), 2200);
  };

  if (screen === 'landing') {
    return (
      <div className="min-h-screen felt-bg text-amber-50 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg rounded-3xl border border-amber-400/25 bg-black/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold mb-2">
                <ShieldCheck className="w-3.5 h-3.5" /> End-to-End Encrypted • AES-256-GCM
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-100">
                8 Card with Friends
              </h1>
              <p className="text-xs sm:text-sm text-emerald-200/75 mt-1">
                4-Player Live Video Table • Combo Turns • Smart AI Bots
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg">
              8♠
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleQuickPlayBots}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl inline-flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
            >
              <Zap className="w-4 h-4 fill-slate-950" /> Quick Play vs 3 Smart Bots (Instant Start)
            </button>

            <div>
              <label className="block text-xs font-semibold text-amber-200/80 mb-1.5">Your Display Name</label>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-amber-200/90">Match Point Limit</span>
                <span className="text-xs font-mono text-amber-300 font-bold">{resolvedPointLimit} Pts</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '50', label: '50 Pts' },
                  { id: '100', label: '100 Pts' },
                  { id: 'custom', label: 'Custom' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLimitMode(opt.id)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      limitMode === opt.id
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                        : 'bg-black/30 text-emerald-100/80 border-white/10 hover:border-amber-400/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {limitMode === 'custom' && (
                <div className="mt-3 space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomLimit((v) => Math.max(10, Number(v) - 25))}
                      className="p-2 rounded-lg bg-black/40 border border-white/10 hover:border-amber-400 text-amber-300"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={10}
                      max={1000}
                      value={customLimit}
                      onChange={(e) => setCustomLimit(e.target.value)}
                      className="flex-1 text-center rounded-lg bg-black/40 border border-white/15 py-1.5 text-sm font-mono font-bold text-amber-200 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomLimit((v) => Math.min(1000, Number(v) + 25))}
                      className="p-2 rounded-lg bg-black/40 border border-white/10 hover:border-amber-400 text-amber-300"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {[25, 75, 150, 200].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCustomLimit(preset)}
                        className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-amber-400/20 border border-white/10 text-[11px] text-amber-200"
                      >
                        {preset} pts
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleCreateRoom}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-sm shadow-lg"
            >
              Create Encrypted 4-Player Room
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-white/10" />
              <span className="px-3 text-[11px] uppercase tracking-widest text-emerald-200/50">or join room</span>
              <div className="flex-grow border-t border-white/10" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="Room Code (6 chars)"
                className="rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-xs font-mono text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-amber-400"
              />
              <input
                value={secretKeyInput}
                onChange={(e) => setSecretKeyInput(e.target.value.toUpperCase())}
                placeholder="Secret Key (XXXX-XXXX...)"
                className="rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-xs font-mono text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="button"
              onClick={handleJoinRoom}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-amber-100 font-bold text-sm transition-colors"
            >
              Join Encrypted Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'lobby' && roomState) {
    const isHost = roomState.hostId === user?.uid;
    return (
      <div className="min-h-screen felt-bg text-amber-50 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl rounded-3xl border border-amber-400/25 bg-black/55 backdrop-blur-xl p-6 sm:p-8 shadow-2xl animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-amber-100">8 Card with Friends — Lobby</h2>
              <p className="text-xs text-emerald-200/75 mt-0.5">
                Room <span className="font-mono font-bold text-amber-300">{roomCode}</span> • Limit:{' '}
                <span className="font-mono font-bold text-amber-300">{roomState.pointLimit} pts</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSecurity(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold"
            >
              <ShieldCheck className="w-4 h-4" /> E2EE Active
            </button>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs space-y-0.5">
              <div className="text-emerald-200/70">Secret Key (never stored on server):</div>
              <div className="font-mono font-bold text-amber-300 tracking-wider">{secretKey}</div>
            </div>
            <button
              type="button"
              onClick={copyInviteLink}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shadow"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? 'Copied Link!' : 'Copy Invite Link'}
            </button>
          </div>

          {isHost && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-amber-200">Host: Adjust Match Point Limit</span>
                <span className="text-xs font-mono text-amber-300 font-bold">{roomState.pointLimit} pts</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[50, 75, 100, 150, 200].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleUpdateLobbyLimit(val)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                      roomState.pointLimit === val
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-black/30 text-emerald-100 border-white/10'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            {[0, 1, 2, 3].map((idx) => {
              const p = roomState.players[idx];
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border p-3.5 flex items-center gap-3 ${
                    p ? 'border-amber-400/30 bg-emerald-950/60' : 'border-dashed border-white/15 bg-black/25'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-bold text-sm">
                    {p ? (p.isBot ? <Bot className="w-5 h-5" /> : p.name.slice(0, 2).toUpperCase()) : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-amber-50 truncate">
                      {p ? p.name : 'Waiting for player...'}
                    </div>
                    <div className="text-[11px] text-emerald-200/60">
                      {p ? (p.id === roomState.hostId ? 'Host' : p.isBot ? 'Smart AI Bot' : 'Ready') : 'Empty Seat'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleCamera}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              {camOn ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4 text-rose-300" />}
              {camOn ? 'Cam On' : 'Test Camera'}
            </button>

            {isHost && roomState.players.length < 4 && (
              <button
                type="button"
                onClick={handleFillBots}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5"
              >
                <Bot className="w-4 h-4" /> Fill Empty Seats with Bots
              </button>
            )}

            {isHost && roomState.players.length === 4 && (
              <button
                type="button"
                onClick={() => startNewRound(roomState)}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold text-sm shadow-lg"
              >
                Start 4-Player Match
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!roomState) return null;

  const myHand = sortHand(roomState.hands?.[user?.uid] || [], roomState.jokerRank);
  const topOpenCard = roomState.openPile?.[roomState.openPile.length - 1] || null;
  const prevOpenCard =
    roomState.turnPhase === 'draw' && roomState.openPile?.length >= 2
      ? roomState.openPile[roomState.openPile.length - 2]
      : null;

  return (
    <div className="min-h-screen felt-bg text-amber-50 flex flex-col justify-between overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/55 backdrop-blur-xl px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center">
            8♠
          </div>
          <div>
            <div className="text-sm font-extrabold text-amber-100 leading-tight">8 Card with Friends</div>
            <div className="text-[11px] text-emerald-200/75 flex items-center gap-2">
              <span>Round {roomState.roundNumber}</span>
              <span>•</span>
              <span className="text-amber-300 font-semibold">Limit: {roomState.pointLimit} pts</span>
            </div>
          </div>
        </div>

        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isComboActive
              ? 'bg-amber-400/25 border-amber-300 text-amber-200 animate-pulse'
              : isRound1Locked
              ? 'bg-amber-500/15 border-amber-400/40 text-amber-300'
              : 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
          }`}
        >
          {isComboActive ? (
            <>
              <Zap className="w-3.5 h-3.5" /> Combo Turn Active ({roomState.comboActionsThisTurn} move{roomState.comboActionsThisTurn > 1 ? 's' : ''})
            </>
          ) : isRound1Locked ? (
            <>
              <Lock className="w-3.5 h-3.5" /> Round 1 Lock ({roomState.turnsCompleted}/4 turns)
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5" /> Table Melding Unlocked
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowSecurity(true)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold inline-flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> E2EE
          </button>
          <button
            type="button"
            onClick={toggleCamera}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
            title="Toggle Camera"
          >
            {camOn ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4 text-rose-300" />}
          </button>
          <button
            type="button"
            onClick={toggleMic}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
            title="Toggle Mic"
          >
            {micOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-rose-300" />}
          </button>
          <button
            type="button"
            onClick={() => setSoundOn((s) => !s)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
            title="Toggle Sound"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-amber-300" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
          <button
            type="button"
            onClick={() => setShowChat(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
            title="Encrypted Chat"
          >
            <MessageSquare className="w-4 h-4 text-amber-200" />
          </button>
          <button
            type="button"
            onClick={() => setShowLog(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
            title="Action Log"
          >
            <ScrollText className="w-4 h-4 text-amber-200" />
          </button>
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
            title="Rules"
          >
            <BookOpen className="w-4 h-4 text-amber-200" />
          </button>
        </div>
      </header>

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-amber-400 text-slate-950 font-bold text-xs shadow-xl animate-fade-in">
          {toast}
        </div>
      )}

      <section className="px-3 sm:px-6 pt-3 flex items-center justify-center gap-2.5 sm:gap-4 flex-wrap">
        {roomState.players.map((p, idx) => (
          <VideoSeatTile
            key={p.id}
            player={p}
            stream={p.id === user?.uid ? localStream : remoteStreams[p.id]}
            isTurn={roomState.status === 'playing' && roomState.turnIndex === idx}
            isMe={p.id === user?.uid}
            score={p.score}
            pointLimit={roomState.pointLimit}
            activity={botActivity[p.id]}
            cardCount={(roomState.hands?.[p.id] || []).length}
          />
        ))}
      </section>

      <main className="flex-1 flex flex-col items-center justify-center px-3 sm:px-6 py-4 gap-5">
        <div className="px-4 py-1.5 rounded-full bg-black/45 border border-white/10 text-xs text-emerald-100/90 text-center max-w-2xl truncate">
          {roomState.actionLog?.[0] || 'Match in progress...'}
        </div>

        <div className="flex items-center justify-center gap-5 sm:gap-8 flex-wrap">
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-amber-300/90 font-bold">
              Wild Joker: {RANK_LABEL[roomState.jokerRank]}
            </span>
            <PlayingCard card={roomState.indicatorCard} jokerRank={-1} small />
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-emerald-200/80 font-bold">
                Unopen ({roomState.unopenPile?.length || 0})
              </span>
              {roomState.reshuffleCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[9px] font-bold text-amber-300">
                  Reshuffled 1/1
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={!isMyTurn || roomState.turnPhase !== 'draw'}
              onClick={() => handleDraw('unopen')}
              className={`w-16 h-24 sm:w-[74px] sm:h-[108px] rounded-xl border-2 flex flex-col items-center justify-center transition-all
                ${
                  isMyTurn && roomState.turnPhase === 'draw'
                    ? 'border-amber-400 bg-gradient-to-br from-emerald-800 to-emerald-950 hover:scale-105 cursor-pointer animate-turn-ring'
                    : 'border-amber-500/30 bg-gradient-to-br from-emerald-900 to-slate-950 opacity-85 cursor-default'
                }`}
            >
              <Sparkles className="w-5 h-5 text-amber-400 mb-1" />
              <span className="text-[10px] font-bold text-amber-200">
                {isMyTurn && roomState.turnPhase === 'draw' ? 'DRAW' : 'DECK'}
              </span>
            </button>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-emerald-200/80 font-bold">
              Open Pile ({roomState.openPile?.length || 0})
            </span>
            {topOpenCard ? (
              <div className="relative">
                <PlayingCard
                  card={prevOpenCard || topOpenCard}
                  jokerRank={roomState.jokerRank}
                  onClick={() => {
                    if (isMyTurn && roomState.turnPhase === 'draw' && prevOpenCard) {
                      handleDraw('open');
                    }
                  }}
                  className={
                    isMyTurn && roomState.turnPhase === 'draw' && prevOpenCard
                      ? 'ring-2 ring-amber-400 cursor-pointer'
                      : ''
                  }
                />
                {isMyTurn && roomState.turnPhase === 'draw' && prevOpenCard && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black whitespace-nowrap">
                    TAKE PREV
                  </span>
                )}
              </div>
            ) : (
              <div className="w-16 h-24 sm:w-[74px] sm:h-[108px] rounded-xl border-2 border-dashed border-white/15 bg-black/25 flex items-center justify-center text-[10px] text-emerald-200/45 text-center px-2">
                Empty Start
              </div>
            )}
          </div>
        </div>

        <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md">
          <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs">
            <span className="font-bold text-amber-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" /> Public Board Melds ({roomState.boardMelds?.length || 0})
            </span>
            <span className="text-[11px] text-emerald-200/70">
              {haveIOpened ? 'Opened — click any meld to Push (Combo allowed!)' : 'Lay down 3+ cards first to unlock Pushing'}
            </span>
          </div>

          {roomState.boardMelds?.length === 0 ? (
            <div className="py-6 text-center text-xs text-emerald-200/50">
              No melds on the table yet. From Round 2, lay down 1 or more valid 3+ card Sequences/Sets!
            </div>
          ) : (
            <div className="overflow-x-auto px-6 sm:px-10 py-4">
              <div className="flex items-center gap-5 min-w-max">
                {roomState.boardMelds.map((meld, mIdx) => {
                  const isSelected = selectedMeldIdx === mIdx;
                  return (
                    <div
                      key={meld.id}
                      onClick={() => setSelectedMeldIdx(isSelected ? null : mIdx)}
                      className={`cursor-pointer rounded-2xl p-2.5 border transition-all ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/15 shadow-lg'
                          : 'border-white/10 bg-black/40 hover:border-amber-400/40'
                      }`}
                    >
                      <div className="text-[10px] text-emerald-200/70 mb-1.5 flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-200 uppercase">{meld.type}</span>
                        <span>by {meld.ownerName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {meld.slots.map((slot, sIdx) => (
                          <PlayingCard
                            key={`${slot.card.id}-${sIdx}`}
                            card={slot.card}
                            jokerRank={roomState.jokerRank}
                            resolvedRank={slot.isJoker ? slot.resolvedRank : null}
                            small
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-white/10 bg-black/65 backdrop-blur-xl">
        <div className="px-4 pt-3 flex flex-wrap items-center justify-center gap-2">
          {isMyTurn ? (
            roomState.turnPhase === 'draw' ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-bold">
                Card discarded! Tap <strong>Unopen Deck</strong> {prevOpenCard ? 'or Previous Open Card' : ''} to draw.
              </div>
            ) : (
              <>
                {!isComboActive && (
                  <button
                    type="button"
                    disabled={selectedCardIds.length !== 1}
                    onClick={handleDiscard}
                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-bold text-xs shadow"
                  >
                    Discard 1 Card (Then Draw)
                  </button>
                )}

                <button
                  type="button"
                  disabled={isRound1Locked || selectedCardIds.length < 3}
                  onClick={handleMeld}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-extrabold text-xs shadow"
                >
                  {isRound1Locked
                    ? 'Meld Locked (Round 1)'
                    : isComboActive
                    ? `Chain Meld (${selectedCardIds.length})`
                    : `Meld to Board (${selectedCardIds.length})`}
                </button>

                {!isRound1Locked && haveIOpened && selectedMeldIdx !== null && selectedCardIds.length > 0 && (
                  roomState.boardMelds[selectedMeldIdx]?.type === 'set' ? (
                    <button
                      type="button"
                      onClick={() => handlePush('set')}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow"
                    >
                      Push to Set
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePush('left')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs inline-flex items-center gap-1 shadow"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Push Left
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePush('right')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs inline-flex items-center gap-1 shadow"
                      >
                        Push Right <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )
                )}

                {isComboActive && (
                  <button
                    type="button"
                    onClick={handleEndComboTurn}
                    className="px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-lg"
                  >
                    <CheckCircle2 className="w-4 h-4" /> End Turn (Done)
                  </button>
                )}
              </>
            )
          ) : (
            <div className="text-xs text-emerald-200/70 py-1.5">
              Waiting for <strong className="text-amber-300">{currentPlayer?.name}</strong>...
            </div>
          )}
        </div>

        <div className="overflow-x-auto px-8 sm:px-14 pt-8 pb-5">
          <div className="flex items-end justify-center gap-2 sm:gap-3 min-w-max mx-auto">
            {myHand.map((card, idx) => (
              <PlayingCard
                key={card.id}
                card={card}
                jokerRank={roomState.jokerRank}
                selected={selectedCardIds.includes(card.id)}
                onClick={() => toggleSelectCard(card.id)}
                style={{ animationDelay: `${idx * 40}ms` }}
                className="animate-card-in"
              />
            ))}
          </div>
        </div>
      </footer>

      {(roomState.status === 'round_over' || roomState.status === 'match_over') && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-amber-400/35 bg-[#082219] p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                {roomState.roundSummary?.type === 'penalty' ? (
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                ) : (
                  <Trophy className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-amber-100">
                  {roomState.status === 'match_over'
                    ? 'Match Over!'
                    : roomState.roundSummary?.type === 'tie'
                    ? 'Round Tied — 0 Points to All'
                    : roomState.roundSummary?.type === 'penalty'
                    ? 'Penalty Declared (+8 Pts)'
                    : `Round ${roomState.roundNumber} Complete`}
                </h3>
                <p className="text-xs text-emerald-200/80">{roomState.roundSummary?.reason}</p>
              </div>
            </div>

            {roomState.status === 'match_over' && roomState.roundSummary?.matchWinner && (
              <div className="my-3 p-3 rounded-xl bg-amber-400/20 border border-amber-400/40 text-center text-sm font-extrabold text-amber-200">
                Champion: {roomState.roundSummary.matchWinner.name} ({roomState.roundSummary.matchWinner.score} pts — Lowest Score!)
              </div>
            )}

            <div className="space-y-2 my-4">
              {roomState.players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-black/35 border border-white/10 text-xs"
                >
                  <span className="font-bold text-amber-50">{p.name}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-rose-300">+{p.lastRoundAdded || 0}</span>
                    <span className="text-amber-300 font-bold">
                      {p.score} / {roomState.pointLimit}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {roomState.hostId === user?.uid ? (
              <button
                type="button"
                onClick={() => {
                  if (roomState.status === 'match_over') {
                    const resetPlayers = roomState.players.map((p) => ({ ...p, score: 0, lastRoundAdded: 0 }));
                    startNewRound({ ...roomState, players: resetPlayers, roundNumber: 0 });
                  } else {
                    startNewRound(roomState);
                  }
                }}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {roomState.status === 'match_over' ? 'Play New Match' : 'Start Next Round'}
              </button>
            ) : (
              <div className="text-center text-xs text-emerald-200/70">Waiting for Host to start next round...</div>
            )}
          </div>
        </div>
      )}

      {showSecurity && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-emerald-400/35 bg-[#071e16] p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> End-to-End Encryption Active
              </h3>
              <button type="button" onClick={() => setShowSecurity(false)}>
                <X className="w-5 h-5 text-emerald-200/70" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-emerald-100/85">
              <p>
                All hands, deck order, board melds, scores, and chat messages are encrypted locally using{' '}
                <strong>PBKDF2-SHA256 (100,000 iterations)</strong> + <strong>AES-256-GCM</strong>.
              </p>
              <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                <div className="text-[10px] text-emerald-300/70 uppercase">Safety Verification Code</div>
                <div className="font-mono text-sm font-bold text-amber-300 mt-0.5">{safetyCode}</div>
              </div>
              {rawCipherPreview && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <div className="text-[10px] text-emerald-300/70 uppercase flex items-center gap-1 mb-1">
                    <Eye className="w-3 h-3" /> Live Ciphertext Preview
                  </div>
                  <div className="font-mono text-[10px] text-emerald-200/65 break-all">
                    IV: {rawCipherPreview.iv}
                    <br />
                    CT: {rawCipherPreview.ct.slice(0, 110)}...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-amber-400/30 bg-[#082219] p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-amber-100">8 Card with Friends — Rules</h3>
              <button type="button" onClick={() => setShowRules(false)}>
                <X className="w-5 h-5 text-emerald-200/70" />
              </button>
            </div>
            <ul className="space-y-2.5 text-xs text-emerald-100/90 list-disc pl-4">
              <li><strong>Deck & Wild Joker:</strong> 4 players get 8 cards each. 1 Indicator Card is revealed; next rank up is the <strong>Wild Joker</strong> (0 pts, usable in any Sequence/Set/Push).</li>
              <li><strong>Empty Open Pile Start:</strong> Turn 1 discards first and draws from the Unopen Pile. Turn 2+ discards first and draws from either Unopen Pile or the previous Open Card.</li>
              <li><strong>Round 1 Meld Lock:</strong> No melding or pushing during the first 4 turns.</li>
              <li><strong>Combo Board Turn (Round 2+):</strong> Lay down a 3+ card Meld or Push onto any board meld to enter <strong>Combo Turn</strong> (Discard/Draw locked). Chain multiple Melds AND Pushes onto your own or other players' melds in the same turn, then tap <strong>End Turn (Done)</strong>.</li>
              <li><strong>Zero Hints & +8 Penalty:</strong> Invalid melds, duplicate pushes onto Joker-occupied ranks, or pushing beyond Ace Low/High immediately end the round with <strong>+8 points</strong> to the offending player and 0 to others.</li>
              <li><strong>1-Time Reshuffle & Auto Tie:</strong> First Unopen Pile exhaustion reshuffles discards once; second exhaustion ends the round in a <strong>Tie (0 pts to all)</strong>.</li>
              <li><strong>Match Limit ({roomState.pointLimit} pts):</strong> First player to reach/exceed the limit loses; lowest score wins the match!</li>
            </ul>
          </div>
        </div>
      )}

      {showLog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
          <div className="w-full max-w-sm bg-[#071d15] border-l border-white/10 p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-amber-100 text-sm">Live Action Log</h3>
              <button type="button" onClick={() => setShowLog(false)}>
                <X className="w-5 h-5 text-emerald-200/70" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 text-xs">
              {(roomState.actionLog || []).map((entry, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-emerald-100/90">
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showChat && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
          <div className="w-full max-w-sm bg-[#071d15] border-l border-white/10 p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-amber-100 text-sm flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-400" /> Encrypted Table Chat
              </h3>
              <button type="button" onClick={() => setShowChat(false)}>
                <X className="w-5 h-5 text-emerald-200/70" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 text-xs">
              {(roomState.chat || []).map((c) => (
                <div key={c.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex justify-between text-[10px] text-amber-300 font-bold mb-0.5">
                    <span>{c.sender}</span>
                    <span className="text-emerald-200/50">{c.ts}</span>
                  </div>
                  <div className="text-emerald-50">{c.text}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {['Nice move!', 'Watch out!', 'Good game!'].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSendChat(q)}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-amber-400/20 text-[11px] text-amber-200"
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Type encrypted message..."
                className="flex-1 rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => handleSendChat()}
                className="p-2.5 rounded-xl bg-amber-400 text-slate-950"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
