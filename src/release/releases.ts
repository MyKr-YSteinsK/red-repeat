export interface ReleaseNote {
  version: string
  date: string
  title: string
  summary: string
  items: readonly string[]
}

export const RELEASES: readonly ReleaseNote[] = [
  {
    version: '1.0.0',
    date: '2026-08-23',
    title: 'RED:REPEAT 1.0',
    summary: '收口为适合长期使用的固定产品模式，并建立从人工 timing 到 Codex source 修复的闭环。',
    items: [
      'Practice 简化为单句、连续、渐速和 0.60x / 0.80x / 1.00x。',
      'Full Song 收口播放跟随、器乐段、回顶部和重置语义。',
      '新增 Settings、系统信息、Changelog、播放切口调试和 Codex 微调导出。',
      '统一 Practice、Full Song、Explain 的 Effective Timing，并在 Edition 更新后自动清理旧微调。',
    ],
  },
  {
    version: '0.9.1',
    date: '2026-08-23',
    title: '播放器层级修复',
    summary: '修复全曲模式中标签与固定播放器的层级关系。',
    items: ['Full Song tabs remain reachable above the fixed player.'],
  },
  {
    version: '0.9.0',
    date: '2026-08-23',
    title: '公开曲库发布',
    summary: '公开 library、GitHub Pages、离线下载和正式 PWA 图标。',
    items: [
      '公开 library/ 成为正式 Runtime source。',
      '首页直接进入曲库，并支持按歌曲下载 Runtime。',
      '补齐 MyKr 品牌字段与正式安装图标。',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-08-21',
    title: '产品壳与移动体验',
    summary: '完成中文曲库、Resume、移动端工作台和全曲播放器收口。',
    items: [
      '首页支持继续学唱与旧学习状态迁移。',
      'Practice 独立滚动，Full Song 使用固定播放器。',
      '修正移动端歌词层级与播放焦点同步。',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-08-21',
    title: '讲解模式',
    summary: '加入 Feature 文章、原地歌词引用和讲解工作台。',
    items: [
      'Feature 支持结构化文章与主题切换。',
      '讲解中的歌词引用可以 bounded playback。',
      '歌词引用可以把用户带回对应 Practice Unit。',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-08-20',
    title: '全曲模式',
    summary: '建立全曲连续歌词播放器和当前句跟随。',
    items: [
      '支持全曲连续播放、当前句高亮和移动播放器。',
      '支持从全曲模式跳入 Practice Unit。',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-08-20',
    title: '高级 Practice 能力',
    summary: '加入范围、速度、Ramp、Shadow 与个人 Timing 基础能力。',
    items: [
      '建立 Practice Scope 与速度控制。',
      '加入 Personal Timing Override 和调试管理。',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-08-20',
    title: 'Practice Unit 学唱架构',
    summary: '建立 Practice contract、学习状态与移动端学唱工作台。',
    items: [
      'Runtime 开始消费 Practice Unit。',
      '加入学习状态与移动端练习布局。',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-08-19',
    title: 'PWA 与视觉模式扩展',
    summary: '建立 PWA runtime caching，并试验 Focus、Immersive 与多视觉模式。',
    items: ['加入离线 Runtime caching 与安装生命周期。'],
  },
  {
    version: '0.2.0',
    date: '2026-08-18',
    title: 'Timeline 与内容工具链',
    summary: '建立音频身份、Timeline Debugger 和内容生产规范。',
    items: [
      '支持 Occurrence / Section timing 校准。',
      '支持 Timeline 导出与内容质量检查。',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-08-18',
    title: 'Runtime 与 Song Edition 基础',
    summary: '建立 Library compiler、Runtime model、Audio Engine 与基础歌词播放。',
    items: [
      '建立 Library source / compiler / runtime model。',
      '建立 Audio Engine、Timeline resolver 与 Feature 内容渲染。',
    ],
  },
]
