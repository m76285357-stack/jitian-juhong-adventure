# 橘红少年大冒险 · 积田小学

基于定稿文创 IP 制作的原创儿童网页小游戏。化州橘红的绿叶、白花、果皮肌理，广东剪纸和校园运动融入角色、场景与互动。文化图形为设计意象，不把化州橘红当普通橘子。

## 游戏

- 花叶跑酷：三个场景，左右换道、跳跃、花叶收集、连击、白花护盾与磁力风车。轻松模式 60 秒，挑战模式 75 秒。
- 剪纸工坊：五片旋转拼图，三种作品，可下载 SVG。
- 我的收藏：六种进步徽章，成绩仅存于当前设备的 localStorage。
- 手机支持触摸按钮、左右滑动和向上滑动；电脑支持方向键、空格、P / Esc 暂停。切换标签或后台时自动暂停。
- 跑酷采用背对玩家、朝前奔跑的角色；人物高度约为画布的21.5%，手机另限制宽度比例，以保留前方障碍视野。
- 速度随着时间连续提高，从基准速度的0.7倍逐渐升到1.3倍；场景切换不突变。障碍间隔也逐渐缩短，每一波保留至少一条可通过跑道。
- 无账号、广告、购买或第三方追踪。首次联网完整加载后，Service Worker 提供离线缓存。

## 本地运行与验证

需要 Node.js 18 或更新版本，无第三方运行依赖。

```sh
npm start
npm test
```

打开 http://127.0.0.1:4173 。不要用 file:// 直接打开，因为浏览器模块和缓存需要 HTTP 环境。

## 发布

GitHub Pages 使用 main 分支根目录；`.nojekyll` 禁用 Jekyll 处理。生产入口预计为：

https://m76285357-stack.github.io/jitian-juhong-adventure/

实际发布状态以 GitHub Pages 返回的 URL 与线上 HTTP 验证为准。

## NFC 卡片接入

把下列完整链接作为 **NDEF URL / URI 记录**写入 NFC 贴纸或卡片，不是普通文本记录：

https://m76285357-stack.github.io/jitian-juhong-adventure/?from=nfc

使用支持 NFC 的手机写卡工具，选择写入、添加记录、URL/链接，粘贴并写入。随后用另一台手机解锁、碰卡、点击系统链接提示，验证游戏出现“碰一碰成功”，再开始游戏。首次打开需联网。二维码见 assets/nfc-qr.png。

`nfc.html` 提供复制链接、备用二维码与网页写卡。网页写卡需要 HTTPS 和浏览器 Web NFC 支持；不支持时使用手机写卡工具。写卡默认不覆盖已有记录；只在用户勾选后覆盖，不锁定卡片。网页没有卡片 UID 验证，`from=nfc` 只是入口标记，不作为安全认证。实体卡的真实读写需要手机完成，本项目浏览器验证不能替代实物验证。

官方参考：[NFC Forum 技术说明](https://nfc-forum.org/learn/nfc-technology/)、[MDN NDEFReader.write](https://developer.mozilla.org/en-US/docs/Web/API/NDEFReader/write)、[GitHub Pages API](https://docs.github.com/en/rest/pages/pages)。

## 素材

assets/mascot.png 是从用户定稿角色通过内置图像生成工具制作的透明游戏角色。轮廓和角色不作为第三方可自由使用的授权声明。图像提示词见 ASSET_PROMPT.md。其他图标和场景为项目内代码绘制。

发布认证只存在会话内存中；源码、素材与仓库不含访问令牌。
