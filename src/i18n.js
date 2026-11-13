const en = {
  'meta.title': 'V8 Engine Simulator — Cross-Plane Powertrain Lab',
  'meta.description': 'An interactive, real-time cross-plane V8 engine simulator built with Three.js. Inspect the crankshaft, valvetrain, firing order and combustion cycle.',
  'aria.home': 'V8 Engine Simulator home',
  'aria.modeNav': 'Visualization mode',
  'aria.spec': 'Engine specification',
  'aria.controls': 'Engine controls',
  'aria.closeControls': 'Close controls',
  'aria.throttle': 'Throttle',
  'aria.load': 'Dyno load',
  'aria.timeWarp': 'Mechanical time warp',
  'aria.camera': 'Camera presets',
  'aria.telemetry': 'Engine telemetry',
  'aria.closeManual': 'Close manual',

  'brand.kicker': 'POWERTRAIN LAB / 01',
  'brand.title': 'CROSS-PLANE <b>V8</b>',
  'brand.sub': 'INTERACTIVE ENGINE SIMULATOR',

  'mode.cutaway': 'CUTAWAY',
  'mode.xray': 'X-RAY',
  'mode.exploded': 'EXPLODED',
  'mode.combustion': 'COMBUSTION',
  'modeLabel.cutaway': 'CUTAWAY',
  'modeLabel.xray': 'X-RAY',
  'modeLabel.exploded': 'EXPLODED',
  'modeLabel.combustion': 'COMBUSTION',

  'title.sound': 'Toggle procedural engine audio (M)',
  'title.labels': 'Toggle annotations (L)',
  'title.help': 'Open operating manual (H)',
  'title.pause': 'Pause / resume (P)',
  'title.step': 'Advance 90 degrees while paused',
  'title.frame': 'Export current frame',
  'title.full': 'Toggle fullscreen',
  'top.labels': 'LABELS',
  'sound.on': 'SOUND ON',
  'sound.off': 'SOUND OFF',
  'chip.focus': 'Focus cylinder {n}',
  'lang.switch': '中文',
  'lang.aria': 'Switch to Chinese',
  'toast.langZh': '界面语言已切换为中文',
  'toast.langEn': 'Interface language set to English',

  'spec.engine': 'ENGINE',
  'spec.overline': 'CROSS-PLANE · DOHC · 32 VALVE',
  'spec.vAngle': 'V-ANGLE',
  'spec.peakTq': 'PEAK TQ',
  'spec.torque': 'TORQUE',
  'spec.output': 'OUTPUT',
  'spec.redline': 'REDLINE',
  'spec.firing': 'FIRING',
  'spec.note1': 'Drag to orbit. Scroll to zoom.',
  'spec.note2': 'Right-drag to pan.',
  'common.intake': 'INTAKE',
  'common.exhaust': 'EXHAUST',
  'common.ignition': 'IGNITION',

  'status.standby': 'STANDBY',
  'status.cranking': 'CRANKING',
  'status.idle': 'IDLE',
  'status.running': 'RUNNING',
  'start.start': 'START ENGINE',
  'start.stop': 'STOP ENGINE',
  'start.cancel': 'CANCEL START',
  'start.sub': 'IGNITION / STARTER',

  'control.title': 'ENGINE CONTROL',
  'control.throttle': 'THROTTLE',
  'control.throttleClosed': 'CLOSED',
  'control.throttleOpen': 'WIDE OPEN',
  'control.load': 'DYNO LOAD',
  'control.loadNone': 'NO LOAD',
  'control.loadFull': 'FULL LOAD',
  'control.timeWarp': 'MECHANICAL TIME WARP',
  'control.visualSpeed': 'VISUAL SPEED',
  'control.flow': 'INTAKE / EXHAUST FLOW',
  'control.grid': 'STUDIO GRID',
  'control.autoOrbit': 'AUTO ORBIT',
  'control.camera': 'CAMERA',
  'control.presets': 'PRESETS',
  'control.pause': 'PAUSE',
  'control.resume': 'RESUME',
  'control.step': 'STEP',
  'control.frame': 'FRAME',
  'control.full': 'FULL',
  'panel.controls': 'CONTROLS',
  'panel.close': 'CLOSE',
  'camera.iso': 'ISO',
  'camera.front': 'FRONT',
  'camera.side': 'SIDE',
  'camera.top': 'TOP',
  'camera.isoTitle': 'Three-quarter view',
  'camera.frontTitle': 'Front elevation',
  'camera.sideTitle': 'Side elevation',
  'camera.topTitle': 'Top plan view',

  'caption.study': 'REAL-TIME MECHANICAL STUDY',
  'dash.rpm': 'RPM · ×1000',
  'dash.dyno': 'DYNO',
  'dash.power': 'POWER',
  'dash.torque': 'TORQUE',
  'dash.oilTemp': 'OIL TEMP',
  'dash.fuelFlow': 'FUEL FLOW',
  'dash.cyclePrefix': 'CYLINDER',
  'dash.cycleSuffix': 'CYCLE',
  'dash.ignition': 'IGNITION',
  'dash.firingOrder': 'FIRING ORDER',
  'dash.load': 'LOAD',
  'dash.spark': 'SPARK',
  'dash.firingNote': '720° CYCLE / 8 POWER PULSES',
  'stroke.intake': 'INTAKE',
  'stroke.compression': 'COMPRESSION',
  'stroke.power': 'POWER',
  'stroke.exhaust': 'EXHAUST',
  'valve.closed': 'VALVES CLOSED',
  'valve.intakeOpen': 'INTAKE OPEN',
  'valve.exhaustOpen': 'EXHAUST OPEN',
  'ignition.off': 'OFF',
  'ignition.on': 'ON',
  'ignition.crank': 'CRANK',
  'spark.armed': 'ARMED',
  'spark.firing': 'FIRING',

  'loader.kicker': 'POWERTRAIN SIMULATION SUITE',
  'loader.title': 'CROSS-PLANE<br><span>V8 ENGINE</span>',
  'loader.body': 'Assembling crankshaft, valvetrain and combustion model.',
  'loader.init': 'INITIALIZING WEBGL',

  'help.kicker': 'OPERATING MANUAL / 01',
  'help.title': 'INTERACTIVE <span>V8</span>',
  'help.lede': 'A real-time mechanical study of a 90° cross-plane V8. Every piston, connecting rod, valve and camshaft is driven by the same crank-angle model that produces the firing order.',
  'help.item1.title': 'ORBIT & INSPECT',
  'help.item1.body': 'Drag to orbit, scroll to zoom, right-drag to pan. Use the four camera presets for repeatable engineering views.',
  'help.item2.title': 'RUN THE ENGINE',
  'help.item2.body': 'Press START or the space bar. Throttle changes engine speed; dyno load trims the achievable RPM. Mechanical time warp only slows the visuals.',
  'help.item3.title': 'READ THE CYCLE',
  'help.item3.body': 'Click any firing-order number to focus that cylinder. The 720° strip shows its intake, compression, power and exhaust strokes.',
  'help.item4.title': 'CHANGE THE VIEW',
  'help.item4.body': 'Cutaway, X-Ray, Exploded and Combustion modes progressively reveal the internal assembly and combustion events.',
  'help.shortcut.start': 'START / STOP',
  'help.shortcut.pause': 'PAUSE',
  'help.shortcut.labels': 'LABELS',
  'help.shortcut.sound': 'SOUND',
  'help.shortcut.reset': 'RESET VIEW',
  'help.shortcut.modes': 'MODES',
  'help.note': '中文提示：拖动旋转 · 滚轮缩放 · 右键平移。点击点火顺序中的数字可切换观察气缸；时间缩放只影响机械视觉，不影响真实转速读数。',
  'help.footer': '5.0L CROSS-PLANE V8 · 32 VALVE DOHC',

  'hotspot.crank.title': 'CROSS-PLANE CRANKSHAFT',
  'hotspot.crank.sub': '90° throws · five main bearings',
  'hotspot.intake.title': 'INTAKE PLENUM',
  'hotspot.intake.sub': 'Tuned runners · drive-by-wire throttle',
  'hotspot.cam.title': 'DOHC CAMSHAFTS',
  'hotspot.cam.sub': 'Half-speed drive · 32 valves',
  'hotspot.exhaust.title': 'EXHAUST HEADERS',
  'hotspot.exhaust.sub': 'Equal-length primaries · 4-into-1',

  'toast.sound': 'PROCEDURAL V8 AUDIO ENABLED',
  'toast.starter': 'STARTER ENGAGED · IGNITION ARMED',
  'toast.stop': 'IGNITION OFF · ENGINE COASTING',
  'toast.caught': 'IGNITION CAUGHT · V8 IDLE',
  'toast.limiter': 'REV LIMITER · 7,350 RPM',
  'toast.pressStart': 'PRESS START TO IGNITE',
  'toast.timeWarp': 'MECHANICAL TIME WARP · {value}×',
  'toast.mode': '{mode} VIEW',
  'toast.step': 'STEP +90° CRANKSHAFT',
  'toast.screenshot': 'FRAME EXPORTED',
  'toast.fullscreen': 'FULLSCREEN NOT AVAILABLE',
  'toast.focus': 'FOCUS CYLINDER {n}',
  'export.watermark': 'V8 ENGINE SIMULATOR',
};

const zh = {
  'meta.title': 'V8 发动机模拟器 — 十字曲轴动力实验室',
  'meta.description': '一个基于 Three.js 的实时交互式 90° 十字曲轴 V8 发动机模拟器，可观察曲轴、配气机构、点火顺序与完整四冲程循环。',
  'aria.home': 'V8 发动机模拟器首页',
  'aria.modeNav': '可视化模式',
  'aria.spec': '发动机参数',
  'aria.controls': '发动机控制',
  'aria.closeControls': '关闭控制面板',
  'aria.throttle': '节气门',
  'aria.load': '测功负载',
  'aria.timeWarp': '机械时间缩放',
  'aria.camera': '相机预设',
  'aria.telemetry': '发动机遥测',
  'aria.closeManual': '关闭操作手册',

  'brand.kicker': '动力总成实验室 / 01',
  'brand.title': '十字曲轴 <b>V8</b>',
  'brand.sub': '交互式发动机模拟器',

  'mode.cutaway': '剖视',
  'mode.xray': 'X 光',
  'mode.exploded': '分解',
  'mode.combustion': '燃烧',
  'modeLabel.cutaway': '剖视',
  'modeLabel.xray': 'X 光透视',
  'modeLabel.exploded': '分解视图',
  'modeLabel.combustion': '燃烧视图',

  'title.sound': '开关程序化 V8 音频 (M)',
  'title.labels': '显示 / 隐藏标注 (L)',
  'title.help': '打开操作手册 (H)',
  'title.pause': '暂停 / 继续 (P)',
  'title.step': '暂停时步进 90°',
  'title.frame': '导出当前画面',
  'title.full': '切换全屏',
  'top.labels': '标注',
  'sound.on': '声音开',
  'sound.off': '声音关',
  'chip.focus': '聚焦气缸 {n}',
  'lang.switch': 'EN',
  'lang.aria': 'Switch to English',
  'toast.langZh': '界面语言已切换为中文',
  'toast.langEn': 'Interface language set to English',

  'spec.engine': '发动机',
  'spec.overline': '十字曲轴 · DOHC · 32 气门',
  'spec.vAngle': 'V 型夹角',
  'spec.peakTq': '峰值扭矩',
  'spec.torque': '扭矩',
  'spec.output': '输出功率',
  'spec.redline': '红线转速',
  'spec.firing': '点火顺序',
  'spec.note1': '拖动旋转 · 滚轮缩放',
  'spec.note2': '右键拖动平移',
  'common.intake': '进气',
  'common.exhaust': '排气',
  'common.ignition': '点火',

  'status.standby': '待机',
  'status.cranking': '启动中',
  'status.idle': '怠速',
  'status.running': '运行中',
  'start.start': '启动发动机',
  'start.stop': '关闭发动机',
  'start.cancel': '取消启动',
  'start.sub': '点火 / 起动机',

  'control.title': '发动机控制',
  'control.throttle': '节气门',
  'control.throttleClosed': '关闭',
  'control.throttleOpen': '全开',
  'control.load': '测功负载',
  'control.loadNone': '空载',
  'control.loadFull': '满载',
  'control.timeWarp': '机械时间缩放',
  'control.visualSpeed': '视觉速度',
  'control.flow': '进气 / 排气流动',
  'control.grid': '工作室网格',
  'control.autoOrbit': '自动环绕',
  'control.camera': '视角',
  'control.presets': '预设',
  'control.pause': '暂停',
  'control.resume': '继续',
  'control.step': '步进',
  'control.frame': '导出',
  'control.full': '全屏',
  'panel.controls': '控制',
  'panel.close': '关闭',
  'camera.iso': 'ISO',
  'camera.front': '前视',
  'camera.side': '侧视',
  'camera.top': '俯视',
  'camera.isoTitle': '三维等轴测视角',
  'camera.frontTitle': '前视图',
  'camera.sideTitle': '侧视图',
  'camera.topTitle': '俯视图',

  'caption.study': '实时机械研究',
  'dash.rpm': '转速 · ×1000',
  'dash.dyno': '测功',
  'dash.power': '功率',
  'dash.torque': '扭矩',
  'dash.oilTemp': '机油温度',
  'dash.fuelFlow': '燃油流量',
  'dash.cyclePrefix': '气缸',
  'dash.cycleSuffix': '循环',
  'dash.ignition': '点火',
  'dash.firingOrder': '点火顺序',
  'dash.load': '负载',
  'dash.spark': '火花',
  'dash.firingNote': '720° 循环 / 8 次做功脉冲',
  'stroke.intake': '进气',
  'stroke.compression': '压缩',
  'stroke.power': '做功',
  'stroke.exhaust': '排气',
  'valve.closed': '气门关闭',
  'valve.intakeOpen': '进气门开启',
  'valve.exhaustOpen': '排气门开启',
  'ignition.off': '关闭',
  'ignition.on': '开启',
  'ignition.crank': '起动',
  'spark.armed': '待命',
  'spark.firing': '点火',

  'loader.kicker': '动力总成仿真套件',
  'loader.title': '十字曲轴<br><span>V8 发动机</span>',
  'loader.body': '正在装配曲轴、配气机构与燃烧模型。',
  'loader.init': '初始化 WEBGL',

  'help.kicker': '操作手册 / 01',
  'help.title': '交互式 <span>V8</span>',
  'help.lede': '这是一台 90° 十字曲轴 V8 的实时机械研究模型。每个活塞、连杆、气门与凸轮轴都由同一套曲轴角模型驱动，并严格产生 1-8-7-2-6-5-4-3 的点火顺序。',
  'help.item1.title': '环绕与检查',
  'help.item1.body': '拖动环绕，滚轮缩放，右键平移。使用四个相机预设获得可重复的工程视角。',
  'help.item2.title': '运转发动机',
  'help.item2.body': '按启动按钮或空格键启动发动机。节气门改变目标转速；测功负载会限制可达转速。机械时间缩放只改变视觉速度。',
  'help.item3.title': '读懂循环',
  'help.item3.body': '点击点火顺序中的任意数字聚焦该气缸。720° 进度条显示进气、压缩、做功和排气四个冲程。',
  'help.item4.title': '切换视图',
  'help.item4.body': '剖视、X 光、分解和燃烧视图会逐步揭示内部总成与燃烧事件。',
  'help.shortcut.start': '启动 / 停止',
  'help.shortcut.pause': '暂停',
  'help.shortcut.labels': '标注',
  'help.shortcut.sound': '声音',
  'help.shortcut.reset': '复位视角',
  'help.shortcut.modes': '视图',
  'help.note': 'English tip: drag to orbit, scroll to zoom, right-drag to pan. Click a firing-order number to focus a cylinder; time warp changes visuals only, not the RPM readout.',
  'help.footer': '5.0L 十字曲轴 V8 · 32 气门 DOHC',

  'hotspot.crank.title': '十字曲轴',
  'hotspot.crank.sub': '90° 曲拐 · 五主轴承',
  'hotspot.intake.title': '进气稳压腔',
  'hotspot.intake.sub': '调谐进气管 · 电子节气门',
  'hotspot.cam.title': '双顶置凸轮轴',
  'hotspot.cam.sub': '半速驱动 · 32 气门',
  'hotspot.exhaust.title': '排气歧管',
  'hotspot.exhaust.sub': '等长一次管 · 四合一',

  'toast.sound': '程序化 V8 音频已开启',
  'toast.starter': '起动机啮合 · 点火就绪',
  'toast.stop': '点火关闭 · 发动机滑行',
  'toast.caught': '点火成功 · V8 进入怠速',
  'toast.limiter': '转速限制器 · 7,350 RPM',
  'toast.pressStart': '按启动键点火',
  'toast.timeWarp': '机械时间缩放 · {value}×',
  'toast.mode': '已切换：{mode}',
  'toast.step': '曲轴步进 +90°',
  'toast.screenshot': '画面已导出',
  'toast.fullscreen': '当前浏览器不支持全屏',
  'toast.focus': '聚焦气缸 {n}',
  'export.watermark': 'V8 发动机模拟器',
};

const STORAGE_KEY = 'v8-engine-lang';
const supported = ['en', 'zh'];

class I18n {
  constructor() {
    let queryLang = null;
    try {
      queryLang = new URLSearchParams(window.location.search).get('lang');
    } catch {
      queryLang = null;
    }
    let stored = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    this.lang = supported.includes(queryLang) ? queryLang : supported.includes(stored) ? stored : 'zh';
    this.messages = { en, zh };
    this.applyDocumentLanguage();
  }

  t(key, params = {}) {
    const dict = this.messages[this.lang] || en;
    const value = dict[key] ?? en[key] ?? key;
    return String(value).replace(/\{(\w+)\}/g, (_, name) =>
      params[name] === undefined ? '' : String(params[name])
    );
  }

  setLanguage(lang) {
    if (!supported.includes(lang) || lang === this.lang) return false;
    this.lang = lang;
    this.applyDocumentLanguage();
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Local files and privacy modes may block storage; the switch still works.
    }
    return true;
  }

  applyDocumentLanguage() {
    document.documentElement.lang = this.lang === 'zh' ? 'zh-CN' : 'en';
    document.documentElement.dataset.lang = this.lang;
    document.title = this.t('meta.title');
  }
}

export const i18n = new I18n();
export default i18n;
