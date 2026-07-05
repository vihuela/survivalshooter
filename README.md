# Dead Rush · 死亡冲刺

竖屏 3D 僵尸割草生存游戏（吸血鬼幸存者式开放竞技场），Three.js 渲染 + Android WebView 壳打包 APK。
全部模型/贴图/音效/特效均为代码程序化生成，零外部素材。

## 玩法

- **无尽尸潮 360° 围攻**：拖动虚拟摇杆走位，自动索敌射击；难度随时间指数增长
- **肉鸽成长**：击杀掉经验石，升级三选一（多重射击/穿透/暴击/嗜血等 10 种强化）
- **武器桶**：打空数字木桶火力翻倍（步枪→双管→等离子机枪）
- **道具 9 种**：核弹、护盾、磁铁、冰冻、烈焰风暴、毒气弹、冰霜新星、医疗包、弹药箱
- **节奏事件**：45 秒一波尸潮突袭，每 2 分钟一个 Boss（击杀必掉武器升级）
- **局外成长**：金币商店 3 项永久属性；最长存活时间排行
- **国际化**：简中/繁中/EN/日/韩，首次跟随设备语言，英文兜底，应用内可切换

## 目录结构

```
web/                Three.js 游戏源码
  src/main.js       主循环、玩法系统、竞技场、刷怪导演
  src/models.js     程序化低模模型（英雄/僵尸/场景/道具）
  src/fx.js         特效系统（加色发光粒子、冲击波、元素领域）
  src/audio.js      WebAudio 程序化音效与环境音乐
  src/i18n.js       五语言国际化
  sim/balance.mjs   难度曲线数值仿真
  index.html        HUD / 首页 / 暂停 / 升级 UI
android/            WebView 壳工程（纯 Java，无三方依赖）
```

## 构建

```bash
# 1. 打包 web 游戏
cd web
npm install
npx esbuild src/main.js --bundle --minify --outfile=dist/game.bundle.js
cp index.html dist/

# 2. 构建 APK（自动把 web/dist 同步进 assets）
cd ../android
./gradlew :app:assembleDebug
# 产物: android/app/build/outputs/apk/debug/app-debug.apk
```

## 调试参数（浏览器打开 dist/index.html 即可玩，桌面支持 WASD）

- `?autostart=1` 跳过首页
- `?demo=1` 无敌模式
- `?freeze=<秒>` 指定时刻冻结逻辑（截图用）
- `?bossat=<秒>` 修改 Boss 出现间隔
- `?tier=<0-2>` 初始武器等级
