/**
 * audio.js — Web Audio API 合成音效模块（单例）
 *
 * 为什么用代码合成而不是音频文件：
 * - 零外部依赖、零文件下载、零 Howler.js
 * - OscillatorNode + GainNode 包络足以区分所有音效风格
 *
 * 导出：initAudio() 首次交互时调用、sfxVolume setter、以及各 play 函数
 */

let ctx = null          // AudioContext 单例，懒加载
let masterGain = null   // 所有 SFX 共用的总音量 GainNode

// 各音效上次触发时间戳，用于 throttle（同一音效 < 30ms 跳过）
const lastPlayTime = {}

// 高频音效降低音量比例（chip_tick / deal_card / card_select）
const HIGH_FREQ_VOL = 0.72  // 基础音量 × 0.72 ≈ 降低约 14%

// ---- 内部工具 ----

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    masterGain = ctx.createGain()
    masterGain.gain.value = _sfxVolume
    masterGain.connect(ctx.destination)
  }
  return ctx
}

// throttle 兜底：同一 key 触发间隔 < 30ms 则跳过
function shouldSkip(key) {
  const now = performance.now()
  if (lastPlayTime[key] && now - lastPlayTime[key] < 30) return true
  lastPlayTime[key] = now
  return false
}

// 创建一个简单的振荡器 → gain 包络 → masterGain
// freq: Hz, type: OscillatorType, attack: s, decay: s, volume: 0-1
function playTone({ freq = 440, type = 'sine', attack = 0.005, decay = 0.15, volume = 0.5, freqEnd = null } = {}) {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime)
  if (freqEnd !== null) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + attack + decay)
  }

  gain.gain.setValueAtTime(0, c.currentTime)
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + attack)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + attack + decay)

  osc.connect(gain)
  gain.connect(masterGain)

  osc.start(c.currentTime)
  osc.stop(c.currentTime + attack + decay + 0.01)
}

// 创建噪声节点（用于弃牌、发牌的沙沙感）
function playNoise({ attack = 0.005, decay = 0.1, volume = 0.15, bandFreq = 1000 } = {}) {
  const c = getCtx()
  const bufferSize = c.sampleRate * (attack + decay + 0.05)
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const source = c.createBufferSource()
  source.buffer = buffer

  // 带通滤波器，让噪声有质感
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = bandFreq
  filter.Q.value = 1.5

  const gain = c.createGain()
  gain.gain.setValueAtTime(0, c.currentTime)
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + attack)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + attack + decay)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(masterGain)

  source.start(c.currentTime)
}

// ---- SFX 音量（外部可设置）----

let _sfxVolume = 0.7  // 默认 70/100

export function setSfxVolume(value) {
  // value: 0-100
  _sfxVolume = Math.max(0, Math.min(100, value)) / 100
  if (masterGain) {
    masterGain.gain.setTargetAtTime(_sfxVolume, getCtx().currentTime, 0.01)
  }
}

// ---- 首次交互激活 AudioContext ----

let activated = false

export function initAudio() {
  if (activated) return
  activated = true

  // 读 localStorage 设置并应用
  try {
    const raw = localStorage.getItem('balatro.settings')
    if (raw) {
      const s = JSON.parse(raw)
      if (typeof s.sfxVolume === 'number') {
        _sfxVolume = s.sfxVolume / 100
      }
    }
  } catch (_) { /* ignore */ }

  // 确保 AudioContext 建立并 resume（绕开浏览器 autoplay 策略）
  const c = getCtx()
  if (c.state === 'suspended') {
    c.resume().catch(() => {})
  }
}

// ---- 各音效函数 ----

/**
 * 出牌音效（sfx_play_cards）
 * 风格：短促上扫"嗖"声，纸牌甩出感
 */
export function playPlayCards() {
  if (shouldSkip('play_cards')) return
  // 噪声 + 上扫正弦
  playNoise({ attack: 0.005, decay: 0.18, volume: 0.18, bandFreq: 1800 })
  playTone({ freq: 350, freqEnd: 900, type: 'sawtooth', attack: 0.01, decay: 0.18, volume: 0.3 })
}

/**
 * 弃牌音效（sfx_discard）
 * 风格：略低沉，纸牌丢弃感，有"扑"的质感
 */
export function playDiscard() {
  if (shouldSkip('discard')) return
  playNoise({ attack: 0.008, decay: 0.22, volume: 0.22, bandFreq: 600 })
  playTone({ freq: 220, freqEnd: 120, type: 'triangle', attack: 0.01, decay: 0.2, volume: 0.28 })
}

/**
 * 选牌/取消选牌音效（sfx_card_select）
 * 风格：极短 tick，频繁触发不烦
 * 高频音效：音量降低 14%
 */
export function playCardSelect() {
  if (shouldSkip('card_select')) return
  const vol = 0.25 * HIGH_FREQ_VOL
  playTone({ freq: 660, type: 'sine', attack: 0.003, decay: 0.06, volume: vol })
}

/**
 * 牌型名出现音效（sfx_hand_type）
 * 风格：轻柔提示 ding
 */
export function playHandType() {
  if (shouldSkip('hand_type')) return
  playTone({ freq: 880, type: 'sine', attack: 0.01, decay: 0.2, volume: 0.35 })
  // 叠一个更高的泛音，给"识别到了"的感觉
  playTone({ freq: 1320, type: 'sine', attack: 0.02, decay: 0.15, volume: 0.15 })
}

/**
 * 逐张高亮 chips 累加 tick（sfx_chip_tick）
 * 风格：短促金属敲击，可连发 5 次不难听
 * 高频音效：音量降低 14%
 */
export function playChipTick() {
  if (shouldSkip('chip_tick')) return
  const vol = 0.38 * HIGH_FREQ_VOL
  playTone({ freq: 1100, type: 'square', attack: 0.002, decay: 0.07, volume: vol })
  // 加一个更低的金属感
  playTone({ freq: 550, type: 'triangle', attack: 0.002, decay: 0.05, volume: vol * 0.5 })
}

/**
 * Joker 触发金光（sfx_joker_trigger）
 * 风格：魔法感闪光音，带一点混响，神秘
 */
export function playJokerTrigger() {
  if (shouldSkip('joker_trigger')) return
  // 上行琶音：快速叠 3 个不同频率
  const c = getCtx()
  const freqs = [523, 659, 784, 1047]  // C5 E5 G5 C6
  freqs.forEach((f, i) => {
    setTimeout(() => {
      playTone({ freq: f, type: 'sine', attack: 0.01, decay: 0.28, volume: 0.28 })
    }, i * 55)
  })
  // 底部神秘嗡鸣
  playTone({ freq: 180, type: 'sine', attack: 0.05, decay: 0.4, volume: 0.15 })
}

/**
 * 公式大字爆出（sfx_score_reveal）
 * 风格：高潮爆发冲击感，"砰"加混响
 */
export function playScoreReveal() {
  if (shouldSkip('score_reveal')) return
  // 低频冲击
  playTone({ freq: 80, freqEnd: 40, type: 'sawtooth', attack: 0.005, decay: 0.35, volume: 0.5 })
  // 高频光芒
  playTone({ freq: 1200, freqEnd: 800, type: 'sine', attack: 0.01, decay: 0.3, volume: 0.35 })
  // 噪声冲击层
  playNoise({ attack: 0.003, decay: 0.15, volume: 0.25, bandFreq: 2500 })
}

/**
 * blindScore 数字累加（sfx_score_count）
 * 风格：低频嗡鸣单次触发
 */
export function playScoreCount() {
  if (shouldSkip('score_count')) return
  playTone({ freq: 220, freqEnd: 280, type: 'sine', attack: 0.02, decay: 0.35, volume: 0.3 })
  playTone({ freq: 330, type: 'sine', attack: 0.03, decay: 0.25, volume: 0.15 })
}

/**
 * 发牌音效（sfx_deal_card）
 * 风格：纸牌滑入摩擦声，可快速逐张触发
 * 高频音效：音量降低 14%
 */
export function playDealCard() {
  if (shouldSkip('deal_card')) return
  const vol = 0.18 * HIGH_FREQ_VOL
  playNoise({ attack: 0.003, decay: 0.1, volume: vol, bandFreq: 1400 })
  playTone({ freq: 800, freqEnd: 500, type: 'sine', attack: 0.003, decay: 0.08, volume: vol * 1.2 })
}

/**
 * 通过一关进商店（sfx_stage_clear）
 * 风格：轻快胜利小段（3-4 个音符）
 */
export function playStageClear() {
  if (shouldSkip('stage_clear')) return
  const notes = [523, 659, 784, 1047]  // C E G C（大调上行）
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone({ freq, type: 'sine', attack: 0.01, decay: 0.22, volume: 0.42 })
    }, i * 110)
  })
}

/**
 * 购买 Joker（sfx_buy_joker）
 * 风格：硬币 + 叮咚，消费感
 */
export function playBuy() {
  if (shouldSkip('buy')) return
  // 硬币高频叮
  playTone({ freq: 1400, freqEnd: 1000, type: 'sine', attack: 0.005, decay: 0.2, volume: 0.35 })
  // 低频咚
  playTone({ freq: 200, freqEnd: 150, type: 'triangle', attack: 0.005, decay: 0.15, volume: 0.3 })
}

/**
 * 通用按钮点击（sfx_button_click）
 * 风格：中性短促 UI 点击
 */
export function playButtonClick() {
  if (shouldSkip('button_click')) return
  playTone({ freq: 440, type: 'square', attack: 0.003, decay: 0.08, volume: 0.22 })
}

/**
 * 通关全部（sfx_victory）
 * 风格：上行欢快琶音，成就感
 */
export function playVictory() {
  if (shouldSkip('victory')) return
  // 双层上行：主旋律 + 泛音八度
  const notes = [523, 587, 659, 698, 784, 880, 988, 1047]  // C D E F G A B C
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone({ freq, type: 'sine', attack: 0.01, decay: 0.35, volume: 0.38 })
      playTone({ freq: freq * 2, type: 'sine', attack: 0.01, decay: 0.3, volume: 0.12 })
    }, i * 120)
  })
  // 最后一个持续长音
  setTimeout(() => {
    playTone({ freq: 1047, type: 'sine', attack: 0.02, decay: 0.9, volume: 0.45 })
  }, notes.length * 120 + 50)
}

/**
 * 失败（sfx_defeat）
 * 风格：下行音阶，略带幽默戏剧感，不太沉重
 */
export function playDefeat() {
  if (shouldSkip('defeat')) return
  const notes = [523, 466, 415, 370, 330, 294, 262]  // C B bB A bA G F（下行半音阶）
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone({ freq, type: 'sawtooth', attack: 0.01, decay: 0.28, volume: 0.35 })
    }, i * 150)
  })
}
