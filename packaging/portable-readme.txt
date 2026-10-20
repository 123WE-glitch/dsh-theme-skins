DSH Theme Skins - portable bundle
Version: {{VERSION}}

这是 DeepSeek Harness 主题皮肤插件的便携版（不含安装程序）。
This is the portable bundle without the installer.

【推荐 / Recommended】
Windows 用户请直接下载并运行 DSH-ThemeSkins-Setup.exe 一键安装。
On Windows, download and run DSH-ThemeSkins-Setup.exe instead.

【手动安装 / Manual install】
任选其一 / either way:
1. 在 Harness 会话里让 Agent 用 Plugin Manager 的 install_bundle 指向本目录绝对路径。
   Ask your Harness agent to install this directory (absolute path) through Plugin Manager's install_bundle.
2. 在 profile 目录（如 %USERPROFILE%\.dsh\profiles\desktop）执行：
   pnpm add "link:<本目录绝对路径>"
   并把 "@local/dsh-theme-skins" 加入同一目录 package.json 的 dsh.profile.bundles 列表。
   Run `pnpm add "link:<this directory>"` inside the profile directory, and add
   "@local/dsh-theme-skins" to dsh.profile.bundles in that profile's package.json.

安装后重启 DeepSeek Harness，在 设置 › 通用 › 主题皮肤 中切换配色。
Restart DeepSeek Harness, then pick a skin in Settings > General > Theme skin.

https://github.com/123WE-glitch/dsh-theme-skins
