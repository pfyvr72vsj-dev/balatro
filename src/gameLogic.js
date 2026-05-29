// ============================================================
// gameLogic.js — 纯逻辑，不含 Vue 响应式
// 牌组生成、牌型识别、计分公式、AI 枚举
// ============================================================

// ---- 常量 ----
export const SUITS = ['♠', '♥', '♦', '♣']
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export const BLINDS = [
  { name: '小盲注', target: 300, icon: '🔵', reward: 5 },
  { name: '中盲注', target: 500, icon: '🟡', reward: 5 },
  { name: '大盲注', target: 800, icon: '🔴', reward: 5 },
]

// Joker 候选库（严格按 PRD §2.1）
export const JOKER_POOL = [
  {
    id: 'jester',
    name: '小丑',
    rarity: 'common',
    price: 3,
    art: '🃏',
    desc: '每手 +4 倍率（无条件加成）',
    // effect(chips, mult, playedCards, handType) returns { chips, mult }
    effect(chips, mult) {
      return { chips, mult: mult + 4 }
    },
  },
  {
    id: 'scholar',
    name: '学者',
    rarity: 'common',
    price: 3,
    art: '📖',
    desc: '打出的牌每张 A：+4 倍率',
    effect(chips, mult, playedCards) {
      const aces = playedCards.filter(c => c.rank === 'A').length
      return { chips, mult: mult + aces * 4 }
    },
  },
  {
    id: 'heart_collector',
    name: '红心收藏家',
    rarity: 'rare',
    price: 5,
    art: '❤️',
    desc: '打出的牌里含 ♥ 时，倍率 ×4',
    effect(chips, mult, playedCards) {
      const hasHeart = playedCards.some(c => c.suit === '♥')
      return { chips, mult: hasHeart ? mult * 4 : mult }
    },
  },
  {
    id: 'club_lover',
    name: '梅花爱好者',
    rarity: 'rare',
    price: 5,
    art: '♣',
    desc: '打出的牌里含 ♣ 时，倍率 ×4',
    effect(chips, mult, playedCards) {
      const hasClub = playedCards.some(c => c.suit === '♣')
      return { chips, mult: hasClub ? mult * 4 : mult }
    },
  },
  {
    id: 'royal_face',
    name: '皇家头牌',
    rarity: 'rare',
    price: 5,
    art: '👑',
    desc: '打出的牌里含 J / Q / K 时，倍率 ×10',
    effect(chips, mult, playedCards) {
      const hasFace = playedCards.some(c => ['J', 'Q', 'K'].includes(c.rank))
      return { chips, mult: hasFace ? mult * 10 : mult }
    },
  },
  {
    id: 'straight_flush_master',
    name: '同花顺大师',
    rarity: 'legendary',
    price: 8,
    art: '🔥',
    desc: '打出同花顺时 +50 倍率',
    effect(chips, mult, playedCards, handType) {
      return { chips, mult: handType === 'straight_flush' ? mult + 50 : mult }
    },
  },
]

// 稀有度色板 (PRD §2.2)
export const RARITY_COLORS = {
  common: '#6cb4d3',
  uncommon: '#5bc97a',
  rare: '#e34b6f',
  legendary: '#b577ff',
}

// ---- 牌组生成 ----
export function buildDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}${suit}` })
    }
  }
  return shuffle(deck)
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---- 点数计算 ----
export function cardValue(rank) {
  if (rank === 'A') return 11
  if (['J', 'Q', 'K'].includes(rank)) return 10
  return parseInt(rank)
}

// ---- 牌型识别 ----
const HAND_TYPES = {
  straight_flush: { name: '同花顺', chips: 100, mult: 8 },
  four_of_a_kind: { name: '四条', chips: 60, mult: 7 },
  full_house: { name: '葫芦', chips: 40, mult: 4 },
  flush: { name: '同花', chips: 35, mult: 4 },
  straight: { name: '顺子', chips: 30, mult: 4 },
  three_of_a_kind: { name: '三条', chips: 30, mult: 3 },
  two_pair: { name: '两对', chips: 20, mult: 2 },
  pair: { name: '对子', chips: 10, mult: 2 },
  high_card: { name: '高牌', chips: 5, mult: 1 },
}

export function getHandTypeName(typeKey) {
  return HAND_TYPES[typeKey]?.name ?? '高牌'
}

// 返回 { type, chips, mult }
export function identifyHand(cards) {
  if (cards.length === 0) return { type: 'high_card', ...HAND_TYPES.high_card }

  const rankOrder = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 }

  const rankCounts = {}
  for (const c of cards) {
    rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1
  }
  const counts = Object.values(rankCounts).sort((a, b) => b - a)
  const isFlush = cards.length === 5 && new Set(cards.map(c => c.suit)).size === 1

  const isStraight = (function() {
    if (cards.length !== 5) return false
    const vals = cards.map(c => rankOrder[c.rank]).sort((a, b) => a - b)
    // Normal straight
    const normal = vals[4] - vals[0] === 4 && new Set(vals).size === 5
    if (normal) return true
    // A-2-3-4-5 (wheel)
    const isWheel = JSON.stringify(vals) === JSON.stringify([2,3,4,5,14])
    // 10-J-Q-K-A (broadway)
    const isBroadway = JSON.stringify(vals) === JSON.stringify([10,11,12,13,14])
    return isWheel || isBroadway
  })()

  if (isFlush && isStraight) return { type: 'straight_flush', ...HAND_TYPES.straight_flush }
  if (counts[0] === 4) return { type: 'four_of_a_kind', ...HAND_TYPES.four_of_a_kind }
  if (counts[0] === 3 && counts[1] === 2) return { type: 'full_house', ...HAND_TYPES.full_house }
  if (isFlush) return { type: 'flush', ...HAND_TYPES.flush }
  if (isStraight) return { type: 'straight', ...HAND_TYPES.straight }
  if (counts[0] === 3) return { type: 'three_of_a_kind', ...HAND_TYPES.three_of_a_kind }
  if (counts[0] === 2 && counts[1] === 2) return { type: 'two_pair', ...HAND_TYPES.two_pair }
  if (counts[0] === 2) return { type: 'pair', ...HAND_TYPES.pair }
  return { type: 'high_card', ...HAND_TYPES.high_card }
}

// ---- 计分公式 (PRD §1.2) ----
export function calcScore(playedCards, ownedJokers) {
  const hand = identifyHand(playedCards)
  let chips = hand.chips + playedCards.reduce((s, c) => s + cardValue(c.rank), 0)
  let mult = hand.mult

  // 按 ownedJokers 顺序逐张触发
  for (const joker of ownedJokers) {
    const res = joker.effect(chips, mult, playedCards, hand.type)
    chips = res.chips
    mult = res.mult
  }

  return {
    score: chips * mult,
    finalChips: chips,
    finalMult: mult,
    handType: hand,
  }
}

// ---- AI 出牌：枚举所有子集取最高分 ----
export function aiBestHand(handCards, ownedJokers) {
  if (handCards.length <= 5) {
    return handCards
  }
  let best = null
  let bestScore = -1
  // 枚举 1..5 张的所有组合
  for (let size = 5; size >= 1; size--) {
    for (const combo of combinations(handCards, size)) {
      const { score } = calcScore(combo, ownedJokers)
      if (score > bestScore) {
        bestScore = score
        best = combo
      }
    }
  }
  return best || handCards.slice(0, 5)
}

function combinations(arr, k) {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [first, ...rest] = arr
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c])
  const withoutFirst = combinations(rest, k)
  return [...withFirst, ...withoutFirst]
}

// ---- 商店 AI 建议：性价比最高 (期望增益/价格) ----
export function aiBestShopJoker(shopJokers, ownedJokers, coins) {
  // 简单估算：对子作为参考手（40分基础），算加上该 Joker 后的边际增益
  const testCards = [
    { rank: 'A', suit: '♠' },
    { rank: 'A', suit: '♥' },
    { rank: 'K', suit: '♦' },
    { rank: 'Q', suit: '♣' },
    { rank: 'J', suit: '♠' },
  ]
  const baseScore = calcScore(testCards, ownedJokers).score
  let bestId = null
  let bestRatio = -1

  for (const j of shopJokers) {
    if (j.sold) continue
    const testJokers = [...ownedJokers, j]
    const newScore = calcScore(testCards, testJokers).score
    const gain = newScore - baseScore
    const ratio = gain / j.price
    if (ratio > bestRatio) {
      bestRatio = ratio
      bestId = j.id
    }
  }
  return bestId
}
