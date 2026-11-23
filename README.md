# RED:REPEAT

以日语歌曲为中心的个人曲库。每首 Song Edition 提供学唱、全曲和讲解三个模式，支持逐句播放、调速、
本地进度、逐曲离线下载和 Timing 微调。

[项目接手与 GPT Project 源文件](docs/项目源文件/00-START_HERE.md) ·
[运行手册](docs/项目源文件/RUNBOOK.md) ·
[当前状态](docs/项目源文件/STATUS.md) ·
[线上曲库](https://mykr-ysteinsk.github.io/red-repeat/)

## 本地开发

在仓库根使用 Git、Node.js 24 和 npm。

```sh
npm ci
npm run library:compile
npm run dev
```

`library/<song-id>/` 存放获批公开的歌曲源文件。开发服务从生成的 `public/library-runtime/`
读取曲库，歌曲源改动后重新编译。生产构建 `npm run build` 会执行编译和 TypeScript 检查。
源码贡献、Timing 订正和内容交付按[歌曲内容生成规范](docs/歌曲内容生成规范.md)进行。

应用运行在浏览器内。Git 同步源文件。Practice 进度、速度、阅读与队列、歌词显示偏好等本地状态可从
设置导出白名单备份，Timing 历史有单独导出，离线歌曲在目标浏览器重新下载。详细边界见[项目合同](docs/项目源文件/PROJECT.md)。

`main` 推送后的 CI 可部署 GitHub Pages。验证、子路径构建和线上身份核验见
[运行手册](docs/项目源文件/RUNBOOK.md)与[版本发布规范](docs/版本发布规范.md)。
