# YXTown Study Assistant MCP

> **自用项目** · 本仓库主要供维护者自用。

通过本机 Chrome 扩展访问已授权的游习堂课程、笔记和官方附件。 本仓库是独立维护的第三方 stdio MCP 连接器。

## 连接自己的账户

1. 安装 Node.js 22+ 与 Chrome，克隆仓库，在根目录运行 `node setup.mjs`。它会为此次安装生成扩展与本机桥接凭据。
2. 打开 `chrome://extensions`，开启开发者模式，选择「加载已解压的扩展程序」，选择刚才打印的 `extensionDirectory`。在此 Chrome 用户中登录游习堂，使用时保持浏览器开启。
3. 如需提取 PDF 文本层，安装 Python 3，运行 `node setup-reader.mjs` 下载并校验依赖。浏览器若要求保存，由用户确认。默认从用户下载目录的 `YXTown-Study` 子目录导入官方文件，自定义下载位置可用 `YXTOWN_DOWNLOAD_DIR` 指定。
4. 数据目录默认为当前用户的 `.local/share/yxtown-study`。自定义时，在 setup 及 MCP 客户端设置同一 `YXTOWN_DATA_DIR`。首次 setup 可设置 `YXTOWN_PORT` 选择空闲回环端口。执行工具的机器须能访问已登录的浏览器。调用 `yxtown_status` 查看 `bridgeConnected`，再用 `yxtown_my_courses` 读取课程。可用 `node --test tests/contract.test.mjs` 执行离线测试。

## 接入 Cursor、DSH 或 Codex

在仓库目录执行对应命令。生成器使用 Python 3，按当前机器的路径输出可合并的客户端配置。

```sh
python client_config.py cursor
python client_config.py dsh
python client_config.py codex
```

| 客户端 | 配置位置 |
| --- | --- |
| Cursor | 项目 `.cursor/mcp.json` 或用户级 `~/.cursor/mcp.json` 的 `mcpServers` |
| DSH | 当前 profile 的插件列表，启用一条 `@deepseek-ai/dsh-mcp-client` 记录 |
| Codex | `~/.codex/config.toml` 的 `mcp_servers` 条目 |

可重复使用 `--env NAME=VALUE` 传递这些设置：`YXTOWN_DATA_DIR`、`YXTOWN_DOWNLOAD_DIR`、`YXTOWN_PYTHON`。涉及密钥的设置只填写私有文件的路径。在客户端刷新工具后先调用 `yxtown_status`。各端使用同一个服务入口，克隆到另一台机器时重新生成路径。仓库另附 Codex 插件清单、图标和技能，可用于打包本地插件。 [Cursor MCP 文档](https://cursor.com/docs/mcp) · [DSH MCP 客户端](https://github.com/deepseek-ai/deepseek-harness/blob/main/packages/mcp/mcp-client/README.zh.md)

## 实现参考

GitHub 数据核对日期为 2026-11-11。

在 GitHub 公开仓库搜索中未找到游习堂专用 MCP。对照 Playwright MCP 的浏览器接入方式，本项目保留只访问游习堂的扩展，并为每次安装生成独立的回环桥接凭据。

- [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) · 39,487 stars，默认分支 623 次提交

## 许可

本项目以 **GNU Affero General Public License v3.0 only（AGPL-3.0-only）** 发布。分发受许可覆盖的修改版或通过网络向用户提供修改版时，应按许可条款向相应用户提供对应源码。仅在本机自行使用无需公开发布。第三方服务及依赖遵循各自条款。[许可全文](LICENSE)

## 账号管理窗口

账号版从本插件详情页点「管理」→「已连接的账户」→「连接另一个账户」。已连接账号右侧菜单提供重命名、重新连接和断开连接。

使用独立 stdio 客户端时可运行 `python account_manager.py` 设置本机账号。站点与凭据保存在部署端；图形窗口需要 Python 的 Tk 组件。

支持按词搜索课程、读取页面实际显示的价格、公告和学习进度。yxtown_course_videos 按课时列出网站明确提供下载的视频附件，以 resourceId 调用 yxtown_download。仅有在线播放器的课时会返回空列表。单附件上限 128 MiB。已配置的 Chrome 用户请在同一数据目录运行 node setup.mjs 更新扩展，然后在 Chrome 扩展页重新加载；各浏览器账号使用独立目录和端口。

## 多账号和终端更新

MCP 入口为 `router.py`，需要 Python 3.11+。主机在本地保存账号配置，默认位置为 `~/.config/ldai-mcp/yxtown-study/accounts.json`，也可用 `LDAI_ACCOUNTS_FILE` 指定。复制 [两账号示例](examples/accounts.example.json)，将地址与路径换成自己的值。为每个账号配置独立 YXTOWN_DATA_DIR，首次通过 profile_exec.py 运行 node setup.mjs 时分别设置不同的 YXTOWN_PORT（例如 19271、19272）。把生成的扩展分别加载到不同的 Chrome 用户资料，然后各自登录。可将 YXTOWN_PORT 直接写进该账号的 env。

`ldai_accounts` 仅列出别名和连接状态。配置两个账号后，工具以 `work__` 和 `personal__` 前缀区分，所选工具始终进入该账号的独立子进程。已有单账号配置继续使用原工具名。运行 `python profile_exec.py work -- <程序> <参数…>` 可在同一账号环境完成登录或初始化。完成配置后重新连接 MCP。需要自有适配器时，管理员可为某个账号填写可信 stdio 程序的 `command`、`args` 和 `env`；连接器仅发布当前产品前缀下的业务工具。

安装本仓库后，其他终端可运行 `git pull --ff-only`；Python 服务在其虚拟环境执行 `python -m pip install -r requirements.txt`，随后重新加载客户端。需要固定版本时可检出发布标签。

维护者在 main 提交改进、运行测试，并同步更新 connector.json、两个插件清单的版本，再执行 `python build_plugin.py --push`。此命令将 main 与版本标签一起推送到本仓库，再从已提交文件生成 ZIP。更新既有账号插件时传 `--account-name <既有包名>`，把生成的 ZIP 发布到同一插件。包内 release-source.json 记录精确提交，可与各终端核对。Git 推送与账号插件发布是两个独立步骤。

许可为 **AGPL-3.0-only**。[许可全文](LICENSE)

[原生插件页多账号接入候选版：部署、覆盖范围与验收](native_account/README.md)

使用 Codex 插件页连接、重连和管理多个工作站账号，见[工作站接入](native_account/WORKSTATION.md)。
