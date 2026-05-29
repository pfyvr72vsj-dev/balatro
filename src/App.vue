<template>
  <!-- 设置按钮（右上角浮动） -->
  <button class="settings-gear-btn" @click="showSettings = true" title="设置">⚙️</button>

  <!-- 设置 Modal -->
  <Teleport to="body">
    <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
      <div class="settings-modal">
        <div class="settings-title">设置</div>
        <div class="settings-body">
          <div class="settings-row">
            <span class="settings-label">BGM 音量</span>
            <input type="range" min="0" max="100" v-model.number="settings.bgmVolume"
              @change="saveSettings" style="accent-color:#4dd6ff;width:140px" />
            <span class="settings-val">{{ settings.bgmVolume }}</span>
          </div>
          <div class="settings-row">
            <span class="settings-label">SFX 音量</span>
            <input type="range" min="0" max="100" v-model.number="settings.sfxVolume"
              @change="saveSettings" style="accent-color:#ff8844;width:140px" />
            <span class="settings-val">{{ settings.sfxVolume }}</span>
          </div>
          <div class="settings-row">
            <span class="settings-label">动画速度</span>
            <div style="display:flex;gap:6px">
              <button
                v-for="sp in ['慢','普通','快']" :key="sp"
                class="speed-btn"
                :class="{ active: settings.animSpeed === sp }"
                @click="settings.animSpeed = sp; saveSettings()">{{ sp }}</button>
            </div>
          </div>
          <div class="settings-row">
            <span class="settings-label">显示出牌公式预览</span>
            <div class="toggle-switch" :class="{ on: settings.showFormulaPreview }"
              @click="settings.showFormulaPreview = !settings.showFormulaPreview; saveSettings()">
              <div class="toggle-knob"></div>
            </div>
          </div>
        </div>
        <div style="text-align:center;margin-top:18px">
          <button class="px-btn btn-skip" @click="showSettings = false">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>

  <div class="game-root">
    <!-- ===== 左 Sidebar ===== -->
    <aside class="sidebar">
      <div class="logo">🃏 小丑牌</div>

      <!-- 盲注面板 -->
      <div class="sb-panel blind-panel">
        <div class="sb-label">盲注 {{ currentBlindIndex + 1 }}/3</div>
        <div class="blind-header">
          <span class="blind-icon">{{ currentBlind.icon }}</span>
          <span class="blind-name">{{ currentBlind.name }}</span>
        </div>
        <div class="inset-box">
          <div class="inset-sub">目标至少</div>
          <div class="inset-score">{{ currentBlind.target }}</div>
          <div class="inset-reward">通关奖励 +${{ blindReward }}</div>
        </div>
      </div>

      <!-- Round Score -->
      <div class="sb-panel score-panel">
        <div class="sb-label">当前分</div>
        <div class="inset-box">
          <div class="round-score-num">{{ displayScore }}</div>
        </div>
        <div class="progress-wrap">
          <div class="progress-bar" :style="{ width: Math.min(100, (blindScore / currentBlind.target) * 100) + '%' }"></div>
        </div>
      </div>

      <!-- HAND 计分块 -->
      <div class="sb-panel hand-score-panel">
        <div class="hand-type-name" :class="{ empty: !currentHandTypeName }">
          {{ currentHandTypeName || '— 选牌出牌 —' }}
        </div>
        <div class="score-row">
          <div class="chips-block">
            <div class="score-num" ref="chipsNumEl">{{ battleChips }}</div>
            <div class="score-unit">筹码</div>
          </div>
          <div class="score-x">×</div>
          <div class="mult-block">
            <div class="score-num" ref="multNumEl">{{ battleMult }}</div>
            <div class="score-unit">倍率</div>
          </div>
        </div>
      </div>

      <!-- 手数 / 弃牌 -->
      <div class="sb-panel hands-discards-panel">
        <div class="hd-block">
          <div class="hd-label">剩余手数</div>
          <div class="hd-val green">{{ handsLeft }}</div>
        </div>
        <div class="hd-block">
          <div class="hd-label">剩余弃牌</div>
          <div class="hd-val red">{{ discardsLeft }}</div>
        </div>
      </div>

      <!-- 金币 -->
      <div class="sb-panel money-panel">
        <div class="money-inner">
          <span class="money-sign">$</span>
          <span class="money-val">{{ coins }}</span>
        </div>
      </div>

      <!-- Ante / Round -->
      <div class="ante-info">
        <span class="ante-orange">底注 1/3</span>
        <span class="ante-dot">·</span>
        <span class="ante-blue">回合 {{ currentBlindIndex + 1 }}</span>
      </div>

      <!-- 重新开始 -->
      <button class="px-btn btn-restart" @click="restartGame">重新开始</button>
    </aside>

    <!-- ===== 右主区 ===== -->
    <main class="main-area">

      <!-- 第 1 段：Joker 区 -->
      <section class="section-joker">
        <div class="section-joker-inner">
          <div class="joker-title">JOKERS · {{ ownedJokers.length }}/5</div>
          <div class="joker-row">
            <JokerCard
              v-for="joker in ownedJokers"
              :key="joker.id"
              :joker="joker"
              :highlighted="highlightedJokerIds.includes(joker.id)"
              :ref="el => setJokerRef(joker.id, el)"
            />
            <!-- 空槽 -->
            <div
              v-for="i in (5 - ownedJokers.length)"
              :key="'empty-' + i"
              class="joker-empty-slot">
              <span class="empty-plus">+</span>
              <span class="empty-label">空槽</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 第 2 段：出牌区（playing 态） -->
      <section
        v-if="gameState === 'playing'"
        class="section-play"
        ref="playAreaEl">
        <div class="play-area-header">
          <span class="play-area-title">出牌区</span>
          <span v-if="playedCards.length > 0" class="play-area-hand-name">{{ currentHandTypeName }}</span>
        </div>

        <!-- 出牌后显示的牌 -->
        <div class="played-cards-row" v-if="playedCards.length > 0">
          <PlayCard
            v-for="(card, idx) in playedCards"
            :key="card.id"
            :card="card"
            :highlighted="highlightedCardIndices.includes(idx)"
            :ref="el => setPlayedRef(idx, el)"
          />
        </div>

        <!-- 空态提示 -->
        <div v-else class="play-area-empty">
          <template v-if="settings.showFormulaPreview && previewChips > 0">
            <span class="preview-formula">
              <span style="color:#4dd6ff">{{ previewChips }}</span>
              <span style="color:#c9d2e8"> × </span>
              <span style="color:#ff8844">{{ previewMult }}</span>
              <span style="color:#c9d2e8"> = </span>
              <span style="color:#ffc857">{{ previewChips * previewMult }}</span>
            </span>
          </template>
          <template v-else>
            选择手牌组成牌型（1-5 张）
          </template>
        </div>

        <!-- 最终公式爆出（中央大字） -->
        <Transition name="formula-pop">
          <div v-if="showFormula" class="formula-popup">
            <span class="ff-chips">{{ formulaChips }}</span>
            <span class="ff-x"> × </span>
            <span class="ff-mult">{{ formulaMult }}</span>
            <span class="ff-eq"> = </span>
            <span class="ff-score">{{ formulaScore }}</span>
          </div>
        </Transition>

        <!-- 飞字容器（chips/mult 飞字） -->
        <div class="fly-texts-container" ref="flyTextsContainer"></div>

        <!-- 牌堆（absolute 内嵌出牌区，PRD §4.4） -->
        <div class="deck-pile" ref="deckPileEl">
          <div class="deck-layer deck-l3"></div>
          <div class="deck-layer deck-l2"></div>
          <div class="deck-layer deck-l1"></div>
          <div class="deck-count">{{ deck.length }}/52</div>
        </div>
      </section>

      <!-- 第 2 段：商店态覆盖 -->
      <section v-else-if="gameState === 'shop'" class="section-shop">
        <div class="shop-title">商店</div>
        <div class="shop-subtitle">通关奖励到账！金币 ${{ coins }} · Joker 槽 {{ ownedJokers.length }}/5</div>
        <div class="shop-cards-row">
          <div v-for="sj in shopJokers" :key="sj.id" class="shop-joker-col">
            <JokerCard
              :joker="sj"
              :dimmed="sj.sold"
              :highlighted="aiHighlightedShopId === sj.id"
            />
            <button
              class="px-btn shop-buy-btn"
              :disabled="sj.sold || coins < sj.price || ownedJokers.length >= 5"
              :class="{
                'btn-sold': sj.sold,
                'btn-cant-afford': !sj.sold && coins < sj.price,
                'btn-slot-full': !sj.sold && coins >= sj.price && ownedJokers.length >= 5,
              }"
              @click="buyJoker(sj)">
              {{ sj.sold ? '已售出' : coins < sj.price ? '钱不够' : ownedJokers.length >= 5 ? '槽满了' : `购买 $${sj.price}` }}
            </button>
          </div>
        </div>
        <div class="shop-bottom-row">
          <button class="px-btn btn-ai" @click="aiShopSuggest">🤖 AI 建议</button>
          <button class="px-btn btn-skip" @click="leaveShop">跳过 →</button>
        </div>
      </section>

      <!-- 第 2 段：胜利/失败态 -->
      <section v-else-if="gameState === 'won' || gameState === 'lost'" class="section-end">
        <div class="end-title" :class="gameState === 'won' ? 'end-won' : 'end-lost'">
          {{ gameState === 'won' ? '🎉 通关全部' : '💀 失败' }}
        </div>
        <div class="end-info">
          <div class="end-coins">最终金币：${{ coins }}</div>
          <div class="end-jokers-label">持有的 Joker</div>
          <div class="end-jokers-row">
            <JokerCard v-for="j in ownedJokers" :key="j.id" :joker="j" />
            <div v-if="ownedJokers.length === 0" class="end-no-joker">（无）</div>
          </div>
        </div>
        <button class="px-btn btn-restart" style="margin-top:24px" @click="restartGame">重新开始</button>
      </section>

      <!-- 第 3 段：手牌 + 操作 -->
      <section class="section-hand" v-if="gameState === 'playing'">
        <div class="hand-header">
          <span class="hand-title">手牌</span>
          <span class="hand-count">已选 {{ selectedIds.size }} / 5 张</span>
        </div>
        <div class="hand-cards-row" ref="handRowEl">
          <PlayCard
            v-for="card in handCards"
            :key="card.id"
            :card="card"
            :selected="selectedIds.has(card.id)"
            :ref="el => setHandRef(card.id, el)"
            @click="toggleSelect(card)"
          />
        </div>
        <div class="action-row">
          <button
            class="px-btn btn-play"
            :disabled="selectedIds.size === 0 || isAnimating"
            @click="handlePlay">
            出牌 ({{ selectedIds.size }})
          </button>
          <button
            class="px-btn btn-discard"
            :disabled="selectedIds.size === 0 || discardsLeft === 0 || isAnimating"
            @click="handleDiscard">
            弃牌 ({{ discardsLeft }})
          </button>
          <button class="px-btn btn-sort" @click="sortByRank">按点排序</button>
          <button class="px-btn btn-sort" @click="sortBySuit">按花排序</button>
          <button
            class="px-btn btn-ai"
            :class="{ 'ai-thinking': isAiThinking }"
            :disabled="isAnimating || isAiThinking"
            @click="handleAiPlay">
            {{ isAiThinking ? '🤔 AI 思考中…' : '🤖 AI 出牌' }}
          </button>
        </div>
      </section>

      <!-- 商店/结束时第3段隐藏占位 -->
      <section v-else class="section-hand section-hand-hidden"></section>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, reactive } from 'vue'
import { gsap } from 'gsap'
import JokerCard from './components/JokerCard.vue'
import PlayCard from './components/PlayCard.vue'
import {
  buildDeck, shuffle, cardValue, identifyHand, calcScore,
  BLINDS, JOKER_POOL, aiBestHand, aiBestShopJoker,
} from './gameLogic.js'

// ---- 设置（localStorage）----
const defaultSettings = { bgmVolume: 50, sfxVolume: 70, animSpeed: '普通', showFormulaPreview: true }
const settings = reactive({ ...defaultSettings })

function loadSettings() {
  try {
    const raw = localStorage.getItem('balatro.settings')
    if (raw) Object.assign(settings, JSON.parse(raw))
  } catch (_) { /* ignore */ }
}
function saveSettings() {
  localStorage.setItem('balatro.settings', JSON.stringify({ ...settings }))
}

const animMult = computed(() => {
  if (settings.animSpeed === '慢') return 1.5
  if (settings.animSpeed === '快') return 0.6
  return 1.0
})

// ---- 游戏状态 ----
const gameState = ref('playing')
const currentBlindIndex = ref(0)
const coins = ref(0)
const ownedJokers = ref([])
const deck = ref([])
const handCards = ref([])
const selectedIds = ref(new Set())
const handsLeft = ref(4)
const discardsLeft = ref(3)
const blindScore = ref(0)
const displayScore = ref(0)
const isAnimating = ref(false)
const isAiThinking = ref(false)
const showSettings = ref(false)

// 出牌区
const playedCards = ref([])
const currentHandTypeName = ref('')
const battleChips = ref(0)
const battleMult = ref(0)
const highlightedCardIndices = ref([])
const highlightedJokerIds = ref([])
const showFormula = ref(false)
const formulaChips = ref(0)
const formulaMult = ref(0)
const formulaScore = ref(0)

// 商店
const shopJokers = ref([])
const aiHighlightedShopId = ref(null)

// 预览
const previewChips = ref(0)
const previewMult = ref(0)

const currentBlind = computed(() => BLINDS[currentBlindIndex.value])
const blindReward = computed(() => currentBlind.value.reward + handsLeft.value)

watch(() => [...selectedIds.value], () => {
  if (settings.showFormulaPreview && selectedIds.value.size > 0) {
    const sel = handCards.value.filter(c => selectedIds.value.has(c.id))
    const { finalChips, finalMult } = calcScore(sel, ownedJokers.value)
    previewChips.value = finalChips
    previewMult.value = finalMult
  } else {
    previewChips.value = 0
    previewMult.value = 0
  }
})

// ---- DOM refs ----
const playAreaEl = ref(null)
const deckPileEl = ref(null)
const chipsNumEl = ref(null)
const multNumEl = ref(null)
const flyTextsContainer = ref(null)

const jokerRefs = {}
const handRefs = {}
const playedRefs = {}

function setJokerRef(id, el) { jokerRefs[id] = el }
function setHandRef(id, el) { handRefs[id] = el }
function setPlayedRef(idx, el) { playedRefs[idx] = el }

// ---- 初始化 ----
function initGame() {
  currentBlindIndex.value = 0
  coins.value = 0
  ownedJokers.value = []
  handsLeft.value = 4
  discardsLeft.value = 3
  blindScore.value = 0
  displayScore.value = 0
  playedCards.value = []
  currentHandTypeName.value = ''
  battleChips.value = 0
  battleMult.value = 0
  selectedIds.value = new Set()
  isAnimating.value = false
  gameState.value = 'playing'
  deck.value = buildDeck()
  handCards.value = []
  setTimeout(() => dealInitialHand(), 80)
}

function restartGame() { initGame() }

function dealInitialHand() {
  const toDeal = deck.value.splice(0, 8)
  handCards.value = toDeal
  setTimeout(() => animateDealCards(toDeal.map(c => c.id)), 60)
}

// ---- 选牌 ----
function toggleSelect(card) {
  if (isAnimating.value) return
  const s = new Set(selectedIds.value)
  if (s.has(card.id)) {
    s.delete(card.id)
  } else {
    if (s.size >= 5) return
    s.add(card.id)
  }
  selectedIds.value = s
  const sel = handCards.value.filter(c => s.has(c.id))
  currentHandTypeName.value = sel.length > 0 ? identifyHand(sel).name : ''
}

// ---- 排序 ----
const RANK_ORDER = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 }
const SUIT_ORDER = { '♠':1,'♥':2,'♦':3,'♣':4 }

function sortByRank() {
  handCards.value = [...handCards.value].sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank])
}
function sortBySuit() {
  handCards.value = [...handCards.value].sort((a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || RANK_ORDER[b.rank] - RANK_ORDER[a.rank])
}

// ---- 出牌主流程 ----
async function handlePlay() {
  if (selectedIds.value.size === 0 || isAnimating.value) return
  isAnimating.value = true

  const sel = handCards.value.filter(c => selectedIds.value.has(c.id))
  const remaining = handCards.value.filter(c => !selectedIds.value.has(c.id))

  // 步骤1：飞牌到出牌区（350ms）
  await animateFlyToPlayArea(sel)

  handCards.value = remaining
  selectedIds.value = new Set()
  previewChips.value = 0
  previewMult.value = 0
  playedCards.value = sel

  // 步骤2：显示牌型名 + 初始 chips/mult
  const hand = identifyHand(sel)
  currentHandTypeName.value = hand.name
  battleChips.value = hand.chips
  battleMult.value = hand.mult
  await sleep(200 * animMult.value)

  // 步骤3：逐张高亮 + chips 累加 + 飞字
  let runningChips = hand.chips
  for (let i = 0; i < sel.length; i++) {
    highlightedCardIndices.value = [i]
    const val = cardValue(sel[i].rank)
    runningChips += val
    battleChips.value = runningChips
    spawnFlyText(`+${val}`, 'chips', i, null)
    await sleep(150 * animMult.value)
  }
  highlightedCardIndices.value = []

  // 步骤4：Joker 触发
  let runningMult = hand.mult
  for (const joker of ownedJokers.value) {
    const before = { chips: runningChips, mult: runningMult }
    const after = joker.effect(runningChips, runningMult, sel, hand.type)
    const deltaChips = after.chips - before.chips
    const deltaMult = after.mult - before.mult

    if (deltaChips !== 0 || deltaMult !== 0) {
      highlightedJokerIds.value = [joker.id]
      if (deltaChips !== 0) {
        battleChips.value = after.chips
        spawnFlyText(`+${deltaChips} 筹码`, 'chips-joker', null, joker.id)
      }
      if (deltaMult !== 0) {
        // 判断是乘法型（mult > 原来2倍以上）
        const isMultiply = before.mult > 0 && (after.mult / before.mult) >= 2 && Number.isInteger(after.mult / before.mult)
        if (isMultiply) {
          spawnFlyText(`×${Math.round(after.mult / before.mult)} 倍率`, 'mult-joker', null, joker.id)
        } else {
          spawnFlyText(`+${deltaMult} 倍率`, 'mult-joker', null, joker.id)
        }
        battleMult.value = after.mult
      }
      runningChips = after.chips
      runningMult = after.mult
    }
    await sleep(300 * animMult.value)
  }
  highlightedJokerIds.value = []

  // 步骤5：中央爆出公式大字
  const finalScore = runningChips * runningMult
  formulaChips.value = runningChips
  formulaMult.value = runningMult
  formulaScore.value = finalScore
  showFormula.value = true
  await sleep(800 * animMult.value)

  // 步骤6：blindScore 插值累加
  const oldScore = blindScore.value
  const newScore = oldScore + finalScore
  animateScoreCount(oldScore, newScore, 600 * animMult.value)
  await sleep(600 * animMult.value)
  blindScore.value = newScore
  displayScore.value = newScore
  handsLeft.value -= 1

  showFormula.value = false

  // 步骤7：重置出牌区 + 补牌
  await sleep(310 * animMult.value)
  playedCards.value = []
  currentHandTypeName.value = ''
  battleChips.value = 0
  battleMult.value = 0

  // 步骤8：判定
  if (blindScore.value >= currentBlind.value.target) {
    await sleep(200)
    enterShopOrWin()
    isAnimating.value = false
    return
  }
  if (handsLeft.value <= 0) {
    gameState.value = 'lost'
    isAnimating.value = false
    return
  }

  // 补牌
  const needed = 8 - handCards.value.length
  if (needed > 0 && deck.value.length > 0) {
    const newCards = deck.value.splice(0, Math.min(needed, deck.value.length))
    handCards.value = [...handCards.value, ...newCards]
    await sleep(50)
    animateDealCards(newCards.map(c => c.id))
  }

  isAnimating.value = false
}

// ---- 弃牌 ----
async function handleDiscard() {
  if (selectedIds.value.size === 0 || discardsLeft.value === 0 || isAnimating.value) return
  isAnimating.value = true

  handCards.value = handCards.value.filter(c => !selectedIds.value.has(c.id))
  selectedIds.value = new Set()
  currentHandTypeName.value = ''
  previewChips.value = 0
  previewMult.value = 0
  discardsLeft.value -= 1

  await sleep(80)

  const needed = 8 - handCards.value.length
  if (needed > 0 && deck.value.length > 0) {
    const newCards = deck.value.splice(0, Math.min(needed, deck.value.length))
    handCards.value = [...handCards.value, ...newCards]
    await sleep(50)
    animateDealCards(newCards.map(c => c.id))
  }

  isAnimating.value = false
}

// ---- 通关/商店 ----
function enterShopOrWin() {
  // PRD §10.2: 大盲注通关 → won，不进商店
  if (currentBlindIndex.value >= BLINDS.length - 1) {
    coins.value += 5 + handsLeft.value
    gameState.value = 'won'
    return
  }
  coins.value += 5 + handsLeft.value
  openShop()
}

function openShop() {
  const pool = shuffle([...JOKER_POOL])
  shopJokers.value = pool.slice(0, 3).map(j => ({ ...j, sold: false }))
  aiHighlightedShopId.value = null
  gameState.value = 'shop'
}

function buyJoker(sj) {
  if (sj.sold || coins.value < sj.price || ownedJokers.value.length >= 5) return
  coins.value -= sj.price
  ownedJokers.value = [...ownedJokers.value, { ...JOKER_POOL.find(j => j.id === sj.id) }]
  sj.sold = true
}

function leaveShop() {
  currentBlindIndex.value += 1
  handsLeft.value = 4
  discardsLeft.value = 3
  blindScore.value = 0
  displayScore.value = 0
  playedCards.value = []
  currentHandTypeName.value = ''
  battleChips.value = 0
  battleMult.value = 0
  deck.value = buildDeck()
  handCards.value = []
  gameState.value = 'playing'
  setTimeout(() => dealInitialHand(), 100)
}

// ---- AI 出牌 ----
async function handleAiPlay() {
  if (isAnimating.value || isAiThinking.value) return
  isAiThinking.value = true

  await sleep(800 * animMult.value)

  const best = aiBestHand(handCards.value, ownedJokers.value)
  selectedIds.value = new Set(best.map(c => c.id))
  currentHandTypeName.value = identifyHand(best).name

  isAiThinking.value = false
  await sleep(200)
  await handlePlay()
}

function aiShopSuggest() {
  const bestId = aiBestShopJoker(shopJokers.value, ownedJokers.value, coins.value)
  aiHighlightedShopId.value = bestId
}

// ---- 动画：飞牌到出牌区 ----
async function animateFlyToPlayArea(cards) {
  if (!playAreaEl.value) return
  const playRect = playAreaEl.value.getBoundingClientRect()

  const promises = cards.map((card, i) => {
    return new Promise(resolve => {
      const comp = handRefs[card.id]
      const el = comp?.$el || comp
      if (!el) { resolve(); return }
      const src = el.getBoundingClientRect()

      const cardW = src.width + 8
      const totalW = cards.length * cardW
      const startX = playRect.left + playRect.width / 2 - totalW / 2
      const targetX = startX + i * cardW
      const targetY = playRect.top + 36

      const clone = el.cloneNode(true)
      clone.style.cssText = `
        position:fixed;
        left:${src.left}px;
        top:${src.top}px;
        width:${src.width}px;
        height:${src.height}px;
        z-index:999;
        pointer-events:none;
        margin:0;
        transform:none;
      `
      document.body.appendChild(clone)

      gsap.to(clone, {
        x: targetX - src.left,
        y: targetY - src.top,
        duration: 0.35 * animMult.value,
        ease: 'power2.out',
        onComplete: () => {
          clone.remove()
          resolve()
        }
      })
    })
  })

  await Promise.all(promises)
}

// ---- 动画：发牌从牌堆飞入手牌 ----
function animateDealCards(cardIds) {
  requestAnimationFrame(() => {
    const deckEl = deckPileEl.value
    if (!deckEl) return
    const deckRect = deckEl.getBoundingClientRect()
    const srcX = deckRect.left + deckRect.width / 2
    const srcY = deckRect.top + deckRect.height / 2

    cardIds.forEach((id, i) => {
      setTimeout(() => {
        const comp = handRefs[id]
        const el = comp?.$el || comp
        if (!el) return
        const dest = el.getBoundingClientRect()

        const clone = el.cloneNode(true)
        clone.style.cssText = `
          position:fixed;
          left:${srcX - dest.width / 2}px;
          top:${srcY - dest.height / 2}px;
          width:${dest.width}px;
          height:${dest.height}px;
          z-index:998;
          pointer-events:none;
          opacity:1;
        `
        document.body.appendChild(clone)

        gsap.to(clone, {
          x: dest.left - (srcX - dest.width / 2),
          y: dest.top - (srcY - dest.height / 2),
          duration: 0.4 * animMult.value,
          ease: 'power2.out',
          onComplete: () => clone.remove(),
        })
      }, i * 60)
    })
  })
}

// ---- 动画：飞字 ----
function spawnFlyText(text, type, cardIdx, jokerId) {
  const container = flyTextsContainer.value
  if (!container) return
  const containerRect = container.getBoundingClientRect()

  let srcEl = null
  if (type === 'chips' && cardIdx !== null) {
    const comp = playedRefs[cardIdx]
    srcEl = comp?.$el || comp
  } else if (jokerId) {
    const comp = jokerRefs[jokerId]
    srcEl = comp?.$el || comp
  }

  let startX = containerRect.width / 2
  let startY = 60
  if (srcEl) {
    const r = srcEl.getBoundingClientRect()
    startX = r.left + r.width / 2 - containerRect.left
    startY = r.top - containerRect.top - 10
  }

  const isChipsType = type === 'chips' || type === 'chips-joker'
  let endX = startX
  let endY = startY - 80

  if (isChipsType && chipsNumEl.value) {
    const r = chipsNumEl.value.getBoundingClientRect()
    endX = r.left + r.width / 2 - containerRect.left
    endY = r.top - containerRect.top
  } else if (!isChipsType && multNumEl.value) {
    const r = multNumEl.value.getBoundingClientRect()
    endX = r.left + r.width / 2 - containerRect.left
    endY = r.top - containerRect.top
  }

  const span = document.createElement('span')
  span.textContent = text
  span.className = 'fly-text ' + (isChipsType ? 'fly-chips' : 'fly-mult')
  span.style.cssText = `position:absolute;left:${startX}px;top:${startY}px;transform:translateX(-50%);pointer-events:none;`
  container.appendChild(span)

  gsap.to(span, {
    x: endX - startX,
    y: endY - startY,
    opacity: 0,
    duration: 0.4 * animMult.value,
    ease: 'power1.out',
    onComplete: () => span.remove(),
  })
}

// ---- blindScore RAF 数字插值 ----
function animateScoreCount(from, to, duration) {
  const start = performance.now()
  function step(now) {
    const t = Math.min(1, (now - start) / duration)
    displayScore.value = Math.round(from + (to - from) * t)
    if (t < 1) requestAnimationFrame(step)
    else displayScore.value = to
  }
  requestAnimationFrame(step)
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

onMounted(() => {
  loadSettings()
  initGame()
})
</script>

<style src="./style.css"></style>
