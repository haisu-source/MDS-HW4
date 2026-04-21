# 部署指南(Supabase + Vercel + Railway + GitHub)

本指南按顺序把 `real-time-tarot-ai` 从本地代码一路部署到 Vercel + Railway。
每一步都写清了要点击的按钮和需要填的环境变量,跟着做就行。

## 0. 准备工作

你需要先注册这几个账号(都免费):

- GitHub — <https://github.com>
- Supabase — <https://supabase.com>
- Vercel — <https://vercel.com> (用 GitHub 登录)
- Railway — <https://railway.app> (用 GitHub 登录)

本地需要 Node.js 20 或更高版本。

```bash
node -v   # 期望 v20.x 或 v22.x
npm -v
```

## 1. 创建 Supabase 项目并导入 schema

1. 登录 Supabase,点 **New project**。
2. 起个名字(例如 `real-time-tarot-ai`),设置一个强密码并记下来。地区选离你最近的。
3. 等项目创建完成(大约 2 分钟)。
4. 在左侧菜单进入 **SQL Editor**,点 **New query**。
5. 打开本仓库的 `supabase/schema.sql`,**全部复制** 粘贴进去,点 **Run**。
   - 这一步会创建 `profiles`、`live_context`、`context_history`、`tarot_cards`、
     `readings`、`saved_readings` 六张表,配好 RLS 策略,并把 `live_context`
     加入 Supabase Realtime 的 publication。
6. 再开一个 New query,粘贴 `supabase/seed.sql`,Run。
   - 这一步会插入 22 张大阿卡那牌,前端抽牌需要这份数据。
7. 去 **Authentication → Providers**,确保 **Email** 是打开的。
   为了测试方便,可以先去 **Authentication → Settings** 把 "Confirm email"
   关掉(上线后再打开)。
8. 拿到三个关键值,都在 **Project Settings → API** 里:
   - `Project URL` → 下面叫 `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → 下面叫 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → 下面叫 `SUPABASE_SERVICE_ROLE_KEY`
     (⚠️ 这个只能给 worker 用,绝对不能塞进前端或 GitHub)

## 2. 本地跑一次,确认没问题

```bash
cd /path/to/hw4
npm install

# 前端环境变量
cp apps/web/.env.example apps/web/.env.local
# 编辑 apps/web/.env.local,填入 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY

# worker 环境变量
cp apps/worker/.env.example apps/worker/.env
# 编辑 apps/worker/.env,填入 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY

# 两个终端各跑一个
npm run dev:web       # http://localhost:3000
npm run dev:worker    # 每 10 分钟 poll 一次
```

本地注册一个账号,设置城市(例如 "Chicago")、星座、阅读风格。
等 worker 打印 `Updated context for Chicago at ...`,刷新前端就能看到 live 数据。

## 3. 把代码推到 GitHub

```bash
cd /path/to/hw4
git init
git add .
git commit -m "initial commit: monorepo, schema, worker, web app"
```

然后去 GitHub 新建一个 **public** repo(作业要求 public),
名字随意比如 `real-time-tarot-ai`,**不要** 勾 README / .gitignore / license
(本地已经有了)。

按照 GitHub 给的命令推上去:

```bash
git branch -M main
git remote add origin https://github.com/<你的用户名>/real-time-tarot-ai.git
git push -u origin main
```

> 作业要求 "multiple commits showing iteration",之后每做完一小块就 commit 一次,
> 不要把所有东西塞在一个 commit 里。

## 4. 部署前端到 Vercel

1. Vercel 首页点 **Add New → Project**。
2. 选刚才建的 GitHub repo,点 **Import**。
3. 配置页:
   - **Framework Preset**: Next.js(通常会自动识别)
   - **Root Directory**: 保持仓库根目录即可,根目录 `vercel.json` 已经指向
     `apps/web`。
   - 如果 Vercel 不认 `vercel.json`,把 Root Directory 改成 `apps/web` 也行,
     两种方式任选一种。
4. **Environment Variables** 里加两条(Environment 全选 Production + Preview +
   Development):
   - `NEXT_PUBLIC_SUPABASE_URL` = 步骤 1 拿到的 Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = 步骤 1 拿到的 anon public key
5. 点 **Deploy**,等 1–2 分钟。
6. 部署成功后 Vercel 会给你一个 `https://<name>.vercel.app` 的地址,打开能看到登录页。
   > 现在前端能登录,但 live_context 还是空的 —— 要先把 worker 部署上去。

## 5. 部署 worker 到 Railway

1. Railway 点 **New Project → Deploy from GitHub repo**,授权后选这个 repo。
2. 进入刚创建的 service,点 **Settings**:
   - **Root Directory**: 改成 `apps/worker`
   - **Build Command / Start Command**: 留空(仓库里的 `railway.toml` 会自动接管)
3. 进入 **Variables** 标签,加两条:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key(⚠️ 只填在这里)
   - 可选:`POLL_INTERVAL_MINUTES=10`
4. 回到 **Deployments** 点 **Deploy**。
5. 打开 **Logs** 看输出,应当看到:
   ```
   Updated context for Chicago at 2026-...
   Initial poll complete. Repeating every 10 minutes.
   ```
   如果报 `No active profile cities found`,说明还没有用户,去前端注册一个用户
   再看日志。

## 6. 端到端验证

1. 在 Vercel 部署好的 URL 注册一个账号,填城市/星座/风格。
2. 最多等 10 分钟(或在 Railway 点 **Restart** 触发一次立即 poll),Supabase
   的 `live_context` 会多出一行你城市的记录。
3. 前端 Dashboard 的 "Live context" 卡片应当在 worker 更新的瞬间自动刷新
   (不需要手动刷页面)—— 这就是 Supabase Realtime 在工作。
4. 点 "Draw a card",会看到结合城市天气 + 月相 + 你的星座/风格生成的解读,
   并存进 `readings` 历史。

## 7. GitHub 后续建议

- 每次改完一块(比如 "add profile edit form")就 `git commit` 一次。作业明确要求
  "multiple git commits showing iteration"。
- 仓库里已经带了 `.github/workflows/ci.yml`,push 后 GitHub Actions 会自动跑
  typecheck + build,能帮你在 Vercel 部署失败之前抓到问题。
- Vercel 和 Railway 都已经和 GitHub 打通:之后每次 `git push origin main`
  会自动重新部署两边,不用手动操作。

## 8. 常见问题

**Vercel 构建报 "Missing NEXT_PUBLIC_SUPABASE_URL"**
前端在 `page.tsx` 里用 `try/catch` 兜住了,页面会显示 "Configuration needed"。
去 Vercel Project Settings → Environment Variables 确认两个公共 key 都在,
然后点 "Redeploy"。

**Railway worker 日志报 "Missing required environment variable"**
去 Variables 页面确认 `NEXT_PUBLIC_SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`
都填了,并且填的值没带多余空格。

**Dashboard 一直 "Waiting for the worker ..."**
最常见三种原因:(1) worker 还没跑完第一次 poll;
(2) 注册用户时填的城市名没法被 Open-Meteo geocoding 识别(试试换成 "Chicago"、
"Seattle" 这种常见名);(3) Supabase 的 Realtime publication 没加
`public.live_context` —— 重新跑一次 `schema.sql` 最后的 `do $$ ... $$` 块即可。

**提交作业前检查清单**

- [ ] Vercel URL 能打开,能注册新账号
- [ ] Railway worker 日志显示在定期 poll
- [ ] Supabase `live_context` 表里至少有一行
- [ ] 前端 Dashboard 看得到 live context,抽牌能保存到 `readings`
- [ ] GitHub repo 是 public 的,commit 历史至少 3 条以上
- [ ] 录了 2–3 分钟 Slack 视频贴进 `#tuesday-night` 或 `#wednesday-night`

## 9. Supabase MCP 配置(可选)

仓库带了 `.mcp.json`,把 Supabase MCP server 连到本地的 Claude Code:

```bash
claude mcp add --transport http supabase https://mcp.supabase.com/mcp
```

之后在 Claude Code 里就能直接让它查 / 改 Supabase 表,不用一直切到 SQL Editor。
