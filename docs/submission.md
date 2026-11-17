# 项目报告提纲（中英，可直接拆成 PDF / PPT）

按 2026-11-17 的官网来写。评委要在几分钟内看懂：做了什么、怎么做、为什么值得走一遍。最终得分 = 专家评委 70% + 玩家评委 30%。下面每一页对齐一个评分项。截图用 `docs/shots/`，真实 Lux3D 前后对比由参赛者在花积分后补上，不要用演示替身冒充。

团队：宿舍改造家 · 团队码 3FO4K4W3AXYC · 王丽（学生，单人）

---

## 第 1 页 · 封面

**中文标题：** 宿舍改造家：把约束走成一间寝室

**英文标题：** Dorm Remix

一句话：中国高校学生说出床位、预算、轮椅和北方冬天的窗，然后走进改好的寝室，换家具，把图发给室友。

放 `docs/shots/01-hall-desktop.png` 和 `docs/shots/04-room-desktop.png`。

---

## 第 2 页 · 问题

四人上床下桌或六人上下铺里，窗只有一扇。吉林一带十一月下午四点已经很暗，北向几乎没有直射。预算常常只有几百元。有同学需要轮椅时，学校的上床下桌拆不掉。室友开会前，大家缺少一张能站在门口看的方案，而不是一张购物链接。

---

## 第 3 页 · 方案

入住卡收集房型、在住人数、预算、朝向、气候和参考图。程序排出 0.9 米过道、让开窗的衣柜，并按「先灯、后装饰」花钱。三维房间可以走动、切换下午到晚自习、替换家具，再导出讨论图。

放 `docs/shots/02-brief-empty.png`、`docs/shots/03-brief-jilin.png`、`docs/shots/11-error.png`（错误预算）、`docs/shots/10-mobile-room.png`。

---

## 第 4 页 · 群核技术栈（约 30%）

**Lux3D 做单体，布局代码做房子。**

每件核心家具有一条官方形状的文生三维请求：`prompt`、`style`、`version: G1`、`faceCount`（10000–300000）、`outputFormat: ["zip","glb"]`、`enablePbr`、`aiPredictSize`。可选 `img` 只挂在椅子上，且必须是公网 https。

直播路径（有密钥时）：

`POST https://api.aholo.ai/global/lux3d/v1/generate/text-to-3d/task/create`  
请求头 `Authorization` 为密钥本身，不加 `Bearer`。  
`GET /global/lux3d/v1/generate/task/get?taskid=`  
状态 0/1 继续，3 成功，4 失败，6 取消。并发上限错误时排队重试，一次只提交一件。成功后取 `.glb`。`NOT_REQUESTED` 不当成文件。结果链接约 2 小时有效。

中国区网关按 SDK 文档使用 `https://api.aholo.cn`（`AHOLO_REGION=cn`）。

**这一页必须贴上你自己的生成记录：** 提示词、任务进行中、成功后的 GLB、放进房间后的画面。演示模式的牌子写着「演示替身 / 不是 Lux3D」，见 `docs/shots/04-room-desktop.png` 与 `docs/shots/05-room-assets.png`。官方示例任务号 1256173、1389515 只出现在「文档示例」折叠里，并注明来源：

`https://labs.aholo.ai/api-docs/specifications/services/lux3d/openapi.en.json`（2026-11-17）

Aholo Viewer 只加载文档中的 `bear.sog` 官方示例，对话框写明那不是寝室。图生三维路由已接好，但本地上传的照片只取色，不会被说成模型。

---

## 第 5 页 · 有趣和想接着看（约 25%）

- 从门口走进去，而不是在仪表盘里看一张渲染图。
- 时间滑杆：冬日下午的窗 vs 晚自习的台灯（`docs/shots/06-room-night.png`）。
- 替换灯、床品、窗帘，收据会告诉室友超了多少钱。
- 「拍一套」得到门口、窗边、过道和每张床，说明烧在图下面（`docs/shots/07-board.png`）。
- 手机能填卡、能看六人间（`docs/shots/10-mobile-room.png`）。

视频分镜见 `VIDEO_PLAN.md`。配音可以，但必须有软件正在跑的画面。

---

## 第 6 页 · 新意（约 20%）

常见做法是「输入一句话，生成一个空房间模型」。这里把**约束**当成设计：过道净宽、窗洞不被柜子挡住、北方下午没有直射所以灯优先、空床架不能假装拆掉、轮椅过得了过道但爬不上上床下桌。Lux3D 生成的是可以换上的物件，房子的规则是可测试的，两者不互相冒充。

---

## 第 7 页 · 完成度（约 20%）

- 中文优先，可切英文（`docs/shots/08-english.png`）。
- 空卡、填写、非法预算、无 WebGL 时的平面图、生成中的排队文案都有。
- `npm test` 覆盖全部房型的过道和窗洞、预算顺序、无障碍警告，以及 Lux3D 请求解析、官方示例、演示模式不发网络、串行队列。
- 静态 `dist/` 可托管。密钥不进包。
- 材料与画面一致：演示就是演示，直播任务带任务号。

---

## 第 8 页 · 传播（约 5%）

2026-11-17 两个官网并不相同，按你提交的站点写，不要两个都假装已经发了。

- 全球站：在 X 介绍项目并带 `#Manycorehackathon`，链接保持公开到结果公布。这项占评分 5%。源代码在该站是 Bonus。
- 中文站：传播加分对应小红书话题 `#Aholo黑客松`。页面把社交媒体和源代码放在加分项。
- 魔搭社区链接是鼓励项，核验后可能增加 Notebook GPU 时长。

若还没发，这一页写「提交前由参赛者发布」，不要填一个不存在的链接。

---

## 第 9 页 · 资产迭代（留给真人）

表格建议：

| 物件 | 提示词 | 第 1 次 | 调整 | 放进房间 |
| --- | --- | --- | --- | --- |
| 床架 | （从应用复制） | 截图 | 面数或风格 | 截图 |
| 椅子 | | | | |
| 台灯 | | | | |

左边可以放演示替身，但标题必须写「本地替身，不是生成」。右边才是 Lux3D 输出。

---

## 第 10 页 · Demo 与结尾

- Demo 链接：（托管之后填）
- 视频：（上传之后填）
- 本地备用：`npm install && npm run dev` → http://127.0.0.1:47321
- 源代码：（仓库公开之后填）

结尾一句：六平米也要有自己的光。灯比地毯优先，窗不要被柜子吃掉。

---

# English slide notes

Use the same page order.

1. **Cover.** Dorm Remix. Chinese students turn beds, budget, a wheelchair, and a winter window into a room they can walk. Team 宿舍改造家, code `3FO4K4W3AXYC`, 王丽.
2. **Problem.** One window, November dusk in Jilin, a few hundred yuan, loft beds the campus will not remove.
3. **Flow.** Housing card → aisle and window rules → walk, night slider, swaps, roommate export. Show empty, error, and mobile shots.
4. **Manycore tools, ~30%.** Lux3D text-to-3D for objects. Layout code for the shell. Live path uses the documented create and `taskid` poll, no `Bearer`, one task at a time, GLB from the success payload. Official sample ids stay labeled as documentation. Viewer sample is `bear.sog`, not the dorm. Paste your real generations on this page.
5. **Fun, ~25%.** Walking, afternoon versus night study, a receipt roommates can argue about, a photo strip.
6. **Innovation, ~20%.** Constraints are the product: 0.9 m aisle, clear window, lamps before rugs, empty frames stay, a loft is not certified accessible.
7. **Completeness, ~20%.** Chinese and English, empty/error/loading, tests, static build, labels that match reality.
8. **Reach, ~5%.** Global site: X post with `#Manycorehackathon`. Chinese site: Xiaohongshu `#Aholo黑客松`. Do not invent a link.
9. **Asset iterations.** Your Lux3D before/after. Stand-ins captioned as stand-ins.
10. **Demo link, video, repo.**

Judging mix on both sites: 70% expert panel, 30% community panel.
