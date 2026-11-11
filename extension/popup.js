// SPDX-License-Identifier: AGPL-3.0-only
chrome.runtime.sendMessage({kind:'status'},r=>document.getElementById('status').textContent=r?.connected?'本机服务已连接':'本机服务未连接，请连接 MCP 客户端并调用 yxtown_status');
document.getElementById('open').onclick=()=>chrome.tabs.create({url:'https://www.yxtown.com/'});
