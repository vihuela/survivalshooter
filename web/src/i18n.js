// i18n: zh (简中) / zht (繁中) / en / ja / ko.
// First launch follows device language; unknown languages fall back to English.
const D = {
  en: {
    tagline: '— SURVIVE THE HORDE —',
    start: '▶ PLAY',
    hint: 'Drag to move',
    best: '🏆 Best survival {0}',
    max: 'MAX',
    shop_hp_n: 'Vitality', shop_hp_d: '+20 HP/lv',
    shop_rate_n: 'Firepower', shop_rate_d: '+8% fire rate/lv',
    shop_dmg_n: 'Warhead', shop_dmg_d: '+0.5 dmg/lv',
    paused: '⏸ PAUSED', resume: 'RESUME', restart: 'RESTART', home: 'HOME',
    youdied: 'YOU DIED', retry: 'RETRY',
    over_stats: 'Survived <b>{0}</b> · Level <b>{1}</b><br>Kills <b>{2}</b> · Coins 🪙 <b>{3}</b><br>Best <b>{4}</b>',
    upgrade_title: '⬆️ LEVEL UP! Pick one',
    survive: 'SURVIVE!',
    surge_ring: '⚠️ HORDE SURROUNDS!', surge_pack: '⚠️ RUNNER CHARGE!',
    boss_come: '☣️ BOSS INCOMING!', boss_kill: '☣️ BOSS DOWN!',
    abom: '☣️ ABOMINATION ☣️',
    tier1: '🔫 FIREPOWER x2!', tier2: '⚡ PLASMA MINIGUN x4!', dmg_up: '💥 DAMAGE UP!',
    barrel_label: 'x2 FIRE',
    p_med: '❤️ +35 HP', p_ammo: '🔫 RAPID FIRE 8s!', p_nuke: '☢️ NUKE!',
    p_shield: '🛡️ Shield: blocks 3 hits', p_magnet: '🧲 Gem magnet!', p_freeze: '❄️ Freeze 6s!',
    p_fire: '🔥 FIRESTORM 7s!', p_gas: '☣️ Toxic clouds x3!', p_nova: '🧊 Frost Nova: frozen 3s!',
    u_rate_n: 'Fire Rate', u_rate_d: '+15% fire speed',
    u_dmg_n: 'Damage', u_dmg_d: '+1 bullet damage',
    u_multi_n: 'Multishot', u_multi_d: '+1 bullet stream',
    u_pierce_n: 'Pierce', u_pierce_d: 'Bullets pierce +1 enemy',
    u_crit_n: 'Critical', u_crit_d: '+15% chance of 3x damage',
    u_hp_n: 'Vitality', u_hp_d: '+25 max HP & heal 25',
    u_magnet_n: 'Pickup Range', u_magnet_d: '+60% gem magnet radius',
    u_ally_n: 'Mercenary', u_ally_d: 'An ally joins the fight',
    u_speed_n: 'Swift', u_speed_d: '+10% move speed',
    u_vamp_n: 'Bloodthirst', u_vamp_d: 'Heal 2 per 10 kills',
    terms: 'Terms of Service', privacy: 'Privacy Policy',
  },
  zh: {
    tagline: '— 尸潮生存 —',
    start: '▶ 开始游戏',
    hint: '拖动屏幕移动',
    best: '🏆 最长存活 {0}',
    max: 'MAX',
    shop_hp_n: '体质', shop_hp_d: '+20 生命/级',
    shop_rate_n: '火力', shop_rate_d: '+8% 射速/级',
    shop_dmg_n: '弹头', shop_dmg_d: '+0.5 伤害/级',
    paused: '⏸ 暂停', resume: '继续', restart: '重来', home: '首页',
    youdied: '☠️ 你死了', retry: '再战',
    over_stats: '存活 <b>{0}</b> · 等级 <b>LV {1}</b><br>击杀 <b>{2}</b> · 金币 🪙 <b>{3}</b><br>最长存活 <b>{4}</b>',
    upgrade_title: '⬆️ 升级！选择强化',
    survive: '活下去!',
    surge_ring: '⚠️ 尸潮包围!', surge_pack: '⚠️ 奔跑者冲锋!',
    boss_come: '☣️ BOSS 来袭!', boss_kill: '☣️ BOSS 击杀!',
    abom: '☣️ 憎恶 ☣️',
    tier1: '🔫 火力加倍!', tier2: '⚡ 等离子机枪 x4!', dmg_up: '💥 伤害提升!',
    barrel_label: '火力x2',
    p_med: '❤️ +35 HP', p_ammo: '🔫 疾速射击 8 秒!', p_nuke: '☢️ 核弹清场!',
    p_shield: '🛡️ 护盾：抵挡 3 次伤害', p_magnet: '🧲 吸附全场经验石!', p_freeze: '❄️ 冰冻尸潮 6 秒!',
    p_fire: '🔥 烈焰风暴 7 秒!', p_gas: '☣️ 毒气弹：三片毒云!', p_nova: '🧊 冰霜新星：冻结 3 秒!',
    u_rate_n: '射速提升', u_rate_d: '开火速度 +15%',
    u_dmg_n: '伤害强化', u_dmg_d: '每发子弹伤害 +1',
    u_multi_n: '多重射击', u_multi_d: '额外一条弹道',
    u_pierce_n: '穿透弹', u_pierce_d: '子弹可再穿透 1 个敌人',
    u_crit_n: '暴击', u_crit_d: '+15% 概率造成 3 倍伤害',
    u_hp_n: '强健体魄', u_hp_d: '生命上限 +25 并回复 25',
    u_magnet_n: '拾取范围', u_magnet_d: '经验石吸附范围 +60%',
    u_ally_n: '雇佣兵', u_ally_d: '一名战友加入战斗',
    u_speed_n: '疾行', u_speed_d: '移动速度 +10%',
    u_vamp_n: '嗜血', u_vamp_d: '每 10 次击杀回复 2 生命',
    terms: '服务协议', privacy: '隐私政策',
  },
  zht: {
    tagline: '— 屍潮生存 —',
    start: '▶ 開始遊戲',
    hint: '拖動螢幕移動',
    best: '🏆 最長存活 {0}',
    max: 'MAX',
    shop_hp_n: '體質', shop_hp_d: '+20 生命/級',
    shop_rate_n: '火力', shop_rate_d: '+8% 射速/級',
    shop_dmg_n: '彈頭', shop_dmg_d: '+0.5 傷害/級',
    paused: '⏸ 暫停', resume: '繼續', restart: '重來', home: '首頁',
    youdied: '☠️ 你死了', retry: '再戰',
    over_stats: '存活 <b>{0}</b> · 等級 <b>LV {1}</b><br>擊殺 <b>{2}</b> · 金幣 🪙 <b>{3}</b><br>最長存活 <b>{4}</b>',
    upgrade_title: '⬆️ 升級！選擇強化',
    survive: '活下去!',
    surge_ring: '⚠️ 屍潮包圍!', surge_pack: '⚠️ 奔跑者衝鋒!',
    boss_come: '☣️ BOSS 來襲!', boss_kill: '☣️ BOSS 擊殺!',
    abom: '☣️ 憎惡 ☣️',
    tier1: '🔫 火力加倍!', tier2: '⚡ 等離子機槍 x4!', dmg_up: '💥 傷害提升!',
    barrel_label: '火力x2',
    p_med: '❤️ +35 HP', p_ammo: '🔫 疾速射擊 8 秒!', p_nuke: '☢️ 核彈清場!',
    p_shield: '🛡️ 護盾：抵擋 3 次傷害', p_magnet: '🧲 吸附全場經驗石!', p_freeze: '❄️ 冰凍屍潮 6 秒!',
    p_fire: '🔥 烈焰風暴 7 秒!', p_gas: '☣️ 毒氣彈：三片毒雲!', p_nova: '🧊 冰霜新星：凍結 3 秒!',
    u_rate_n: '射速提升', u_rate_d: '開火速度 +15%',
    u_dmg_n: '傷害強化', u_dmg_d: '每發子彈傷害 +1',
    u_multi_n: '多重射擊', u_multi_d: '額外一條彈道',
    u_pierce_n: '穿透彈', u_pierce_d: '子彈可再穿透 1 個敵人',
    u_crit_n: '暴擊', u_crit_d: '+15% 機率造成 3 倍傷害',
    u_hp_n: '強健體魄', u_hp_d: '生命上限 +25 並回復 25',
    u_magnet_n: '拾取範圍', u_magnet_d: '經驗石吸附範圍 +60%',
    u_ally_n: '傭兵', u_ally_d: '一名戰友加入戰鬥',
    u_speed_n: '疾行', u_speed_d: '移動速度 +10%',
    u_vamp_n: '嗜血', u_vamp_d: '每 10 次擊殺回復 2 生命',
    terms: '服務協議', privacy: '隱私政策',
  },
  ja: {
    tagline: '— ゾンビの大群を生き延びろ —',
    start: '▶ ゲーム開始',
    hint: 'ドラッグで移動',
    best: '🏆 最長生存 {0}',
    max: 'MAX',
    shop_hp_n: '体力', shop_hp_d: '+20 HP/Lv',
    shop_rate_n: '火力', shop_rate_d: '+8% 連射/Lv',
    shop_dmg_n: '弾頭', shop_dmg_d: '+0.5 ダメージ/Lv',
    paused: '⏸ 一時停止', resume: '再開', restart: 'リスタート', home: 'ホーム',
    youdied: '☠️ 死亡', retry: 'リトライ',
    over_stats: '生存 <b>{0}</b> · レベル <b>{1}</b><br>撃破 <b>{2}</b> · コイン 🪙 <b>{3}</b><br>最長 <b>{4}</b>',
    upgrade_title: '⬆️ レベルアップ！強化を選択',
    survive: '生き延びろ!',
    surge_ring: '⚠️ 大群に包囲された!', surge_pack: '⚠️ ランナー突撃!',
    boss_come: '☣️ ボス出現!', boss_kill: '☣️ ボス撃破!',
    abom: '☣️ アボミネーション ☣️',
    tier1: '🔫 火力2倍!', tier2: '⚡ プラズマミニガン x4!', dmg_up: '💥 ダメージアップ!',
    barrel_label: '火力x2',
    p_med: '❤️ +35 HP', p_ammo: '🔫 高速連射 8秒!', p_nuke: '☢️ 核爆!',
    p_shield: '🛡️ シールド：3回防御', p_magnet: '🧲 全ジェム吸引!', p_freeze: '❄️ 6秒間氷結!',
    p_fire: '🔥 火炎ストーム 7秒!', p_gas: '☣️ 毒ガス弾 x3!', p_nova: '🧊 フロストノヴァ：3秒凍結!',
    u_rate_n: '連射強化', u_rate_d: '発射速度 +15%',
    u_dmg_n: 'ダメージ強化', u_dmg_d: '弾ダメージ +1',
    u_multi_n: 'マルチショット', u_multi_d: '弾道 +1',
    u_pierce_n: '貫通弾', u_pierce_d: '敵を1体追加貫通',
    u_crit_n: 'クリティカル', u_crit_d: '+15%で3倍ダメージ',
    u_hp_n: '体力強化', u_hp_d: '最大HP+25 & 25回復',
    u_magnet_n: '回収範囲', u_magnet_d: 'ジェム吸引範囲 +60%',
    u_ally_n: '傭兵', u_ally_d: '仲間が参戦する',
    u_speed_n: '俊足', u_speed_d: '移動速度 +10%',
    u_vamp_n: '吸血', u_vamp_d: '10キルごとにHP2回復',
    terms: '利用規約', privacy: 'プライバシーポリシー',
  },
  ko: {
    tagline: '— 좀비 무리에서 살아남아라 —',
    start: '▶ 게임 시작',
    hint: '드래그로 이동',
    best: '🏆 최장 생존 {0}',
    max: 'MAX',
    shop_hp_n: '체력', shop_hp_d: '+20 HP/레벨',
    shop_rate_n: '화력', shop_rate_d: '+8% 연사/레벨',
    shop_dmg_n: '탄두', shop_dmg_d: '+0.5 데미지/레벨',
    paused: '⏸ 일시정지', resume: '계속', restart: '다시 시작', home: '홈',
    youdied: '☠️ 사망', retry: '재도전',
    over_stats: '생존 <b>{0}</b> · 레벨 <b>{1}</b><br>처치 <b>{2}</b> · 코인 🪙 <b>{3}</b><br>최고 기록 <b>{4}</b>',
    upgrade_title: '⬆️ 레벨 업! 강화 선택',
    survive: '살아남아라!',
    surge_ring: '⚠️ 좀비 떼 포위!', surge_pack: '⚠️ 러너 돌격!',
    boss_come: '☣️ 보스 등장!', boss_kill: '☣️ 보스 처치!',
    abom: '☣️ 어보미네이션 ☣️',
    tier1: '🔫 화력 2배!', tier2: '⚡ 플라즈마 미니건 x4!', dmg_up: '💥 데미지 증가!',
    barrel_label: '화력x2',
    p_med: '❤️ +35 HP', p_ammo: '🔫 고속 연사 8초!', p_nuke: '☢️ 핵폭발!',
    p_shield: '🛡️ 보호막: 3회 방어', p_magnet: '🧲 젬 자석!', p_freeze: '❄️ 6초 빙결!',
    p_fire: '🔥 화염 폭풍 7초!', p_gas: '☣️ 독가스 구름 x3!', p_nova: '🧊 프로스트 노바: 3초 동결!',
    u_rate_n: '연사 강화', u_rate_d: '발사 속도 +15%',
    u_dmg_n: '데미지 강화', u_dmg_d: '탄환 데미지 +1',
    u_multi_n: '멀티샷', u_multi_d: '탄줄기 +1',
    u_pierce_n: '관통탄', u_pierce_d: '적 1명 추가 관통',
    u_crit_n: '치명타', u_crit_d: '+15% 확률로 3배 데미지',
    u_hp_n: '체력 강화', u_hp_d: '최대 HP +25 & 25 회복',
    u_magnet_n: '획득 범위', u_magnet_d: '젬 자석 범위 +60%',
    u_ally_n: '용병', u_ally_d: '동료가 합류합니다',
    u_speed_n: '신속', u_speed_d: '이동 속도 +10%',
    u_vamp_n: '흡혈', u_vamp_d: '10킬마다 HP 2 회복',
    terms: '서비스 약관', privacy: '개인정보 처리방침',
  },
};

export const LANG_LIST = [
  { code: 'zh', label: '简中' },
  { code: 'zht', label: '繁中' },
  { code: 'en', label: 'EN' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
];

function detect() {
  const langs = navigator.languages || [navigator.language || 'en'];
  for (const raw of langs) {
    const l = String(raw).toLowerCase();
    if (l.startsWith('zh')) {
      if (l.includes('hant') || l.includes('tw') || l.includes('hk') || l.includes('mo')) return 'zht';
      return 'zh';
    }
    if (l.startsWith('ja')) return 'ja';
    if (l.startsWith('ko')) return 'ko';
    if (l.startsWith('en')) return 'en';
  }
  return 'en';   // fallback
}

let current = localStorage.getItem('dr_lang');
if (!current || !D[current]) current = detect();

export function getLang() { return current; }
export function setLang(code) {
  if (!D[code]) code = 'en';
  current = code;
  localStorage.setItem('dr_lang', code);
}
export function t(key, ...args) {
  let s = (D[current] && D[current][key]) ?? D.en[key] ?? key;
  for (let i = 0; i < args.length; i++) s = s.replaceAll('{' + i + '}', String(args[i]));
  return s;
}
