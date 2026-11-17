# 只有人能做的步骤

代理没有登录 Aholo、没有提交选题、没有提交作品、没有花积分、没有发帖，也没有删除任何赛事数据。下面这些必须由王丽在自己的账号里完成。

截止日期（2026-11-17 官网）：

- 中文站：2026-11-19 19:00（北京时间）
- 全球站：2026-11-19 6:00 a.m. EST（UTC−5）

两边是同一个时刻。以你实际报名的站点为准。

## 1. 在官方账号里用 Lux3D 积分

1. 打开本应用，进入一间寝室，点「Lux3D」。
2. 复制床架、椅子、灯等提示词。
3. 在你自己的 Lux3D 网页里逐条生成（会消耗积分）。官方接口同时只能跑一个生成任务。
4. 把返回的 GLB `https` 链接贴回对应的「放入」。页面会标成「外部链接，来源未核验」。
5. 或者在本机 `.env` 写入 `AHOLO_API_KEY` 后重启 `npm run dev`，点「用 Lux3D 生成这些件」。这也会花积分。成功的件会标成「Lux3D #任务号」。
6. 把提示词、等待中的界面、成功后的模型和放进房间的画面截下来，供报告里的「资产迭代」使用。不要把演示替身说成生成结果。

## 2. 提交选题

把 [`topic.md`](topic.md) 里的选题名称和选题简介贴进赛事站点的选题表单。这不是最终作品。团队码 `3FO4K4W3AXYC` 若表单另有一栏，填在那一栏，不要写进简介。选题提交后才会分团队积分。

## 3. 把 Demo 放到静态空间

```bash
npm run build
```

将 `dist/` 发布到 GitHub Pages 或其他静态托管。`base` 已是相对路径，不依赖 Vercel。记下公网 URL。

本地给评委的备用方式：`npm run preview`，地址 `http://127.0.0.1:47321`。静态站没有密钥时代仍是完整演示模式。

## 4. 录视频

按 [`VIDEO_PLAN.md`](VIDEO_PLAN.md)。必须包含软件真实运行的画面。可以剪辑、配音、加字幕。若只用演示模式，画面里必须看得见「演示替身」；真实 Lux3D 生成过程请另录一段接在后面。

## 5. 做项目报告 PDF 或 PPT

按 [`submission.md`](submission.md) 的页序。放上 `docs/shots/` 和你自己生成的前后对比。材料要和实际 Demo 一致。

## 6. 在截止前提交最终作品

在你报名的站点提交报告和可运行 Demo（链接或含真实运行画面的视频）。可以多次提交的，以站点说明为准，保留最后一次。

中英站点材料不完全一样（2026-11-17 页面）：

- 全球站 aholo.ai：项目报告、可运行 Demo 为 Required；源代码为 Bonus。评审第 5 项（5%）是在 X 发介绍并带 `#Manycorehackathon`，帖子保持公开到结果公布。
- 中文站 aholo.cn：报告书与完整 Demo 是提交主体；小红书 `#Aholo黑客松` 和源代码在页面结构里写的是加分项。传播项对应小红书而不是 X。
- 两边都鼓励把作品发到魔搭社区，核验后可能加 20 小时 Notebook GPU。这不是替你提交。

## 7. 可选传播（人来发，不要代发）

- 若走全球站评分：在 X 介绍项目，带 `#Manycorehackathon`，提交帖子链接。
- 若走中文站评分：在小红书介绍项目，带 `#Aholo黑客松`，提交帖子链接。
- 源代码仓库链接按你所在站点是必交还是加分来附上。

## English checklist

1. Spend Lux3D credits in your own account, using the prompts in the app. Paste GLB URLs back, or run `npm run dev` with `AHOLO_API_KEY`. Do not describe stand-ins as generations.
2. Paste the topic from `topic.md` into the event form. Team code `3FO4K4W3AXYC`.
3. Publish `dist/` on GitHub Pages or any static host. Save the public URL.
4. Record the video in `VIDEO_PLAN.md`, including real running footage.
5. Build the PDF or PPT from `submission.md`, including your own Lux3D before/after images.
6. Submit on the site you registered, before 2026-11-19 19:00 Beijing / 6:00 a.m. EST.
7. Optional reach: X `#Manycorehackathon` for the global score, Xiaohongshu `#Aholo黑客松` for the Chinese score.
