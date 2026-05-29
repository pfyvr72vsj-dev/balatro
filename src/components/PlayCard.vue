<template>
  <div
    class="play-card"
    :class="{
      'card-selected': selected,
      'card-highlighted': highlighted,
      'card-red': isRed,
    }"
    @click.stop="$emit('click')"
  >
    <div class="card-corner top-left">
      <div class="card-rank">{{ card.rank }}</div>
      <div class="card-suit-sm">{{ card.suit }}</div>
    </div>
    <div class="card-center-suit">{{ card.suit }}</div>
    <div class="card-corner bottom-right rotate180">
      <div class="card-rank">{{ card.rank }}</div>
      <div class="card-suit-sm">{{ card.suit }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  card: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  highlighted: { type: Boolean, default: false },
})

defineEmits(['click'])

const isRed = computed(() => props.card.suit === '♥' || props.card.suit === '♦')
</script>

<style scoped>
.play-card {
  width: 100px;
  height: 145px;
  background: linear-gradient(180deg, #ffffff, #f5f0e8);
  border: 2px solid #1a0f24;
  border-radius: 8px;
  box-shadow: 0 3px 0 rgba(0,0,0,.45), 0 4px 12px rgba(0,0,0,.3);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  flex-shrink: 0;
  user-select: none;
}

.play-card:hover {
  box-shadow: 0 4px 0 rgba(0,0,0,.45), 0 6px 16px rgba(74,107,255,.3);
}

/* 选中：向上跳 */
.card-selected {
  transform: translateY(-26px);
  box-shadow: 0 6px 0 rgba(74,107,255,.6), 0 10px 24px rgba(74,107,255,.4) !important;
  border-color: #4a6bff;
}

/* 出牌高亮（逐张） */
.card-highlighted {
  transform: translateY(-18px);
  box-shadow: 0 4px 0 rgba(77,214,255,.6), 0 8px 20px rgba(77,214,255,.5) !important;
}

/* 红色花色 */
.card-red .card-rank,
.card-red .card-suit-sm,
.card-red .card-center-suit {
  color: #cc1111;
}

.card-corner {
  position: absolute;
  top: 5px;
  left: 7px;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}
.card-corner.rotate180 {
  top: auto;
  left: auto;
  bottom: 5px;
  right: 7px;
  transform: rotate(180deg);
}

.card-rank {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 16px;
  font-weight: 900;
  color: #1a0a28;
  line-height: 1;
}
.card-suit-sm {
  font-size: 12px;
  color: #1a0a28;
  line-height: 1;
}
.card-center-suit {
  font-size: 36px;
  color: #1a0a28;
  line-height: 1;
}
</style>
