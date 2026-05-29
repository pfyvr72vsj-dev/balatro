<template>
  <div
    class="joker-card"
    :class="{
      'joker-highlighted': highlighted,
      'joker-dimmed': dimmed,
    }"
    :style="{ '--rarity-color': rarityColor }"
  >
    <div class="joker-corner joker-tl"></div>
    <div class="joker-corner joker-tr"></div>
    <div class="joker-corner joker-bl"></div>
    <div class="joker-corner joker-br"></div>
    <div class="joker-art">{{ joker.art }}</div>
    <div class="joker-name">{{ joker.name }}</div>
    <div class="joker-desc">{{ joker.desc }}</div>
    <div class="joker-price" v-if="joker.price">
      <span class="joker-price-sign">$</span>{{ joker.price }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RARITY_COLORS } from '../gameLogic.js'

const props = defineProps({
  joker: { type: Object, required: true },
  highlighted: { type: Boolean, default: false },
  dimmed: { type: Boolean, default: false },
})

const rarityColor = computed(() => RARITY_COLORS[props.joker.rarity] || '#6cb4d3')
</script>

<style scoped>
.joker-card {
  position: relative;
  width: 140px;
  height: 200px;
  background: linear-gradient(180deg, #fff8e1, #f7e9c4, #e9d6a4);
  border: 2px solid #1a0f24;
  border-radius: 10px;
  box-shadow: 0 4px 0 rgba(0,0,0,.5), 0 6px 16px rgba(0,0,0,.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 8px;
  flex-shrink: 0;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

/* 四角稀有度内描边 */
.joker-corner {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid var(--rarity-color);
}
.joker-tl { top: 4px; left: 4px; border-right: none; border-bottom: none; border-radius: 4px 0 0 0; }
.joker-tr { top: 4px; right: 4px; border-left: none; border-bottom: none; border-radius: 0 4px 0 0; }
.joker-bl { bottom: 4px; left: 4px; border-right: none; border-top: none; border-radius: 0 0 0 4px; }
.joker-br { bottom: 4px; right: 4px; border-left: none; border-top: none; border-radius: 0 0 4px 0; }

.joker-art {
  font-size: 44px;
  line-height: 1;
  margin-bottom: 2px;
}

.joker-name {
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: #1a0f24;
  text-align: center;
  line-height: 1.2;
}

.joker-desc {
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 10px;
  font-weight: 500;
  color: #4a3a24;
  text-align: center;
  line-height: 1.4;
  padding: 0 4px;
}

.joker-price {
  position: absolute;
  bottom: 6px;
  right: 8px;
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 12px;
  font-weight: 800;
  color: #b8860b;
}
.joker-price-sign {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
}

/* 触发高亮：上移 + 金光 */
.joker-highlighted {
  transform: translateY(-18px) scale(1.15) !important;
  box-shadow: 0 0 16px 6px #ffd700, 0 8px 24px rgba(0,0,0,.6) !important;
}

/* 商店已售出 */
.joker-dimmed {
  opacity: 0.45;
}
</style>
