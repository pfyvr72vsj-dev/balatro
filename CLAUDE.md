# CLAUDE.md

本仓库的工作指引。给在此协作的 Claude 实例看。

## 项目定位

Balatro 风格的「扑克 + 小丑牌组合」网页游戏。玩家出 5 张以内扑克牌型 + 持有小丑牌（Joker）触发加成攒分，4 手内打到盲注目标分则通关进商店买卡变强，依次推进 3 个递增盲注（小盲注 300 / 中盲注 500 / 大盲注 800），全过即通关。

这是一个分 6 轮迭代的教学项目，当前已完成**第 1 轮**：完整核心循环 + 设置面板 + 4 类动效 + 本地启发式 AI 出牌。

需求与设计规范是单一事实来源，改任何玩法/数值/文案/视觉前先读：
- `01-第1轮-PRD-小丑牌核心循环.html` —— 玩法、数值、文案、状态机、验收清单、12 条硬约束（全部锁定）
- `01-第1轮-DESIGN-小丑牌核心循环.html` —— 配色 token、布局比例、组件样式、字体三类分工、8 步计分动画时序

## 技术栈

Vue 3（`<script setup>` Composition API）+ Vite + GSAP。无后端、无登录、无 API key。字体走 Google Fonts（Press Start 2P / VT323 / Inter），Joker 用 emoji 占位。

## 目录约定

```
index.html              入口 + Google Fonts 引入
vite.config.js          base 自适应（DEPLOY_TARGET=pages 时切到 /balatro/）
src/
├── main.js             Vue 挂载
├── style.css           全局样式：CSS 变量(token) / 布局 / 组件 / 动画
├── gameLogic.js        纯逻辑：牌组 / 牌型识别 / 计分公式 / Joker effect / AI 枚举
├── App.vue             主应用：状态机(playing/shop/won/lost) + 8 步动画时序
└── components/
    ├── JokerCard.vue   Joker 卡 140×200，四角稀有度描边
    └── PlayCard.vue    扑克牌 100×145，选中上移 / 高亮
```

## 常用命令

```bash
npm install         # 装依赖
npm run dev         # 开发服务器 http://localhost:5173
npm run build       # 生产构建（要求 0 error 0 warning）
npm run preview     # 预览构建产物
```

## 改动时必须遵守（PRD §10 翻车点，逐条锁定）

- **布局**：右主区 grid `grid-template-rows: 230px 1fr 280px`（不要 1fr 1fr 1fr）；sidebar `min(28vw,480px)` + `min-width:280px`；main-area 不要 padding-right。
- **牌堆**：第 2 段出牌区内 `position:absolute`（绝不 fixed），父容器 PlayArea 设 `position:relative`。
- **状态机**：大盲注通关先判 `currentBlindIndex >= BLINDS.length-1 → won`，不进商店。
- **按钮文案**：出牌 `(选中数)`、弃牌 `(剩余弃牌数)`，不要写反。
- **字体三类不混**：中文用 Inter+PingFang SC；数字大屏用 VT323；纯英文装饰用 Press Start 2P。中文绝不用后两者渲染。
- **背景**：深蓝水纹 `#0a1438→#1a2858`，不要偏紫。
- 数值/文案改动一律对照 PRD §1-3 + §6 锁定表，不要自创。

## 工程化约定

- **1 轮 = 1 commit**，message 格式 `feat: 第 N 轮 - 主题（v1.X.0）`。
- 构建校验放最后一次性跑，不要每改一个文件 build 一次。
- 除 README.md / CLAUDE.md 外不要新增 .md 文件。
- 协作流程：需求用 product-manager、设计用 ui-designer、实现用 fullstack-engineer、验收用 qa-engineer（项目级 agent 在 `.claude/agents/`）。
