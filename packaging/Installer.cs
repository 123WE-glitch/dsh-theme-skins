// DSH Theme Skins — single-file installer / uninstaller.
//
// The runtime bundle files are embedded as base64 (see Payload.g.cs, generated
// by packaging/generate-payload.mjs), so this executable is fully self-contained.
//
// Install:   double-click, or run `DSH-ThemeSkins-Setup.exe --silent`.
// Uninstall: run the copy named `DSH-ThemeSkins-Uninstall.exe`, or pass `--uninstall`.
//
// Environment overrides used for testing:
//   DSH_HOME             Harness home (default: %USERPROFILE%\.dsh)
//   DSH_PROFILE_DIR      profile directory (default: <DSH_HOME>\profiles\desktop)
//   DSH_THEME_SKINS_DIR  install target (default: %LOCALAPPDATA%\dsh-theme-skins)
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("DSH Theme Skins Setup")]
[assembly: AssemblyProduct("DSH Theme Skins")]
[assembly: AssemblyCompany("123WE-glitch")]
[assembly: AssemblyDescription("Installer for the DeepSeek Harness Theme Skins bundle")]
[assembly: AssemblyVersion("1.1.0.0")]
[assembly: AssemblyFileVersion("1.1.0.0")]

namespace DshThemeInstaller
{
    internal static class Program
    {
        [STAThread]
        private static void Main(string[] args)
        {
            bool silent = HasFlag(args, "--silent") || HasFlag(args, "-s");
            bool uninstall = HasFlag(args, "--uninstall")
                || AppDomain.CurrentDomain.FriendlyName.IndexOf("uninstall", StringComparison.OrdinalIgnoreCase) >= 0;

            if (silent)
            {
                try { Console.OutputEncoding = new UTF8Encoding(false); }
                catch (Exception) { }
                int exitCode = 0;
                try
                {
                    InstallReport report = uninstall
                        ? Installer.Uninstall(LogToConsole)
                        : Installer.Install(LogToConsole);
                    Console.WriteLine(report.Summary);
                }
                catch (Exception error)
                {
                    Console.Error.WriteLine(error.Message);
                    exitCode = 1;
                }
                Environment.Exit(exitCode);
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm(uninstall));
        }

        private static void LogToConsole(string line)
        {
            Console.WriteLine(line);
        }

        private static bool HasFlag(string[] args, string flag)
        {
            foreach (string arg in args)
            {
                if (string.Equals(arg, flag, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }
    }

    internal sealed class InstallReport
    {
        public string ProfileDir;
        public string TargetDir;
        public string LogPath;
        public bool UsedPnpm;
        public string Summary;
        public readonly List<string> Lines = new List<string>();
    }

    /// <summary>File-system and process helpers shared by install and uninstall.</summary>
    internal static class Installer
    {
        private static readonly string BundleName = Payload.BundleName;
        private static readonly UTF8Encoding Utf8NoBom = new UTF8Encoding(false);

        internal static string DshHome()
        {
            string home = Environment.GetEnvironmentVariable("DSH_HOME");
            if (string.IsNullOrEmpty(home))
            {
                home = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".dsh");
            }
            if (!Directory.Exists(home))
            {
                throw new InvalidOperationException(
                    "没有找到 DeepSeek Harness 的数据目录：" + home +
                    "。请先启动一次 DeepSeek Harness 桌面端后再运行本安装程序。");
            }
            return home;
        }

        internal static string ProfileDir(string dshHome)
        {
            string configured = Environment.GetEnvironmentVariable("DSH_PROFILE_DIR");
            if (!string.IsNullOrEmpty(configured) && Directory.Exists(configured)) return configured;

            string desktop = Path.Combine(dshHome, "profiles", "desktop");
            if (Directory.Exists(desktop)) return desktop;

            string profiles = Path.Combine(dshHome, "profiles");
            if (Directory.Exists(profiles))
            {
                string[] dirs = Directory.GetDirectories(profiles);
                if (dirs.Length > 0) return dirs[0];
            }
            throw new InvalidOperationException(
                "没有找到 Harness 的 profile 目录，请先启动一次 DeepSeek Harness 桌面端。");
        }

        internal static string TargetDir()
        {
            string custom = Environment.GetEnvironmentVariable("DSH_THEME_SKINS_DIR");
            if (!string.IsNullOrEmpty(custom)) return custom;
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "dsh-theme-skins");
        }

        internal static InstallReport Install(Action<string> progress)
        {
            InstallReport report = new InstallReport();
            string dshHome = DshHome();
            report.ProfileDir = ProfileDir(dshHome);
            report.TargetDir = TargetDir();
            report.LogPath = Path.Combine(report.TargetDir, "install.log");

            progress("正在安装主题文件到 " + report.TargetDir + " …");
            ExtractPayload(report.TargetDir);
            SafeAppend(report.LogPath, "extracted payload to " + report.TargetDir);

            string packageJsonPath = Path.Combine(report.ProfileDir, "package.json");
            if (!File.Exists(packageJsonPath))
            {
                throw new InvalidOperationException("没有找到 profile 的 package.json：" + packageJsonPath);
            }
            BackupOnce(packageJsonPath);

            RuntimePnpm runtime = RuntimePnpm.Find(dshHome);
            bool dependencyOk = false;
            if (runtime != null)
            {
                progress("正在通过 Harness 自带的 pnpm 登记插件…");
                dependencyOk = runtime.PnpmAdd(report.ProfileDir, report.TargetDir);
                report.UsedPnpm = dependencyOk;
                SafeAppend(report.LogPath, "pnpm add " + (dependencyOk ? "ok" : "failed"));
            }
            if (!dependencyOk)
            {
                progress("正在写入 profile 依赖与插件链接…");
                string text = File.ReadAllText(packageJsonPath, Encoding.UTF8);
                text = JsonPatch.ReplaceDependency(text, BundleName, "link:" + Forward(report.TargetDir), true);
                File.WriteAllText(packageJsonPath, text, Utf8NoBom);
                EnsureJunction(report.ProfileDir, report.TargetDir);
            }

            progress("正在启用主题插件…");
            string patched = File.ReadAllText(packageJsonPath, Encoding.UTF8);
            patched = JsonPatch.ReplaceBundles(patched, BundleName, true);
            File.WriteAllText(packageJsonPath, patched, Utf8NoBom);

            if (!File.ReadAllText(packageJsonPath, Encoding.UTF8).Contains(BundleName))
            {
                throw new InvalidOperationException("插件登记失败：请把 " + report.LogPath + " 发给作者排查。");
            }
            if (runtime != null && runtime.NodeExe != null && !JsonPatch.IsValidJson(runtime.NodeExe, packageJsonPath))
            {
                RestoreBackup(packageJsonPath);
                throw new InvalidOperationException("写入后的 package.json 不是合法 JSON，已还原原文件。");
            }
            DeleteBackup(packageJsonPath);

            report.Summary = "主题皮肤已安装完成（" + Payload.BundleVersion + "）。请重启 DeepSeek Harness，" +
                             "然后在 设置 › 通用 › 主题皮肤 中选择配色。";
            SafeAppend(report.LogPath, report.Summary);
            SafeAppend(report.LogPath, "install completed successfully");
            progress("安装完成，重启 DeepSeek Harness 后生效。");
            return report;
        }

        internal static InstallReport Uninstall(Action<string> progress)
        {
            InstallReport report = new InstallReport();
            string dshHome = DshHome();
            report.ProfileDir = ProfileDir(dshHome);
            report.TargetDir = TargetDir();
            string parent = Path.GetDirectoryName(report.TargetDir);
            if (string.IsNullOrEmpty(parent))
            {
                parent = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            }
            report.LogPath = Path.Combine(parent, "dsh-theme-skins-uninstall.log");

            string packageJsonPath = Path.Combine(report.ProfileDir, "package.json");
            progress("正在移除插件登记…");
            if (File.Exists(packageJsonPath))
            {
                BackupOnce(packageJsonPath);
                string text = File.ReadAllText(packageJsonPath, Encoding.UTF8);
                text = JsonPatch.ReplaceBundles(text, BundleName, false);
                text = JsonPatch.ReplaceDependency(text, BundleName, string.Empty, false);
                File.WriteAllText(packageJsonPath, text, Utf8NoBom);

                RuntimePnpm runtime = RuntimePnpm.Find(dshHome);
                if (runtime != null && runtime.NodeExe != null && !JsonPatch.IsValidJson(runtime.NodeExe, packageJsonPath))
                {
                    RestoreBackup(packageJsonPath);
                    throw new InvalidOperationException("写入后的 package.json 不是合法 JSON，已还原原文件。");
                }
                DeleteBackup(packageJsonPath);
            }
            RemoveJunction(report.ProfileDir);
            DeleteTarget(report.TargetDir);

            report.Summary = "主题皮肤已卸载。请重启 DeepSeek Harness 使界面恢复默认。";
            SafeAppend(report.LogPath, report.Summary);
            SafeAppend(report.LogPath, "uninstall completed successfully");
            progress("已卸载，重启 DeepSeek Harness 后生效。");
            return report;
        }

        /// <summary>Best-effort log append: a failure must never break the install.</summary>
        internal static void SafeAppend(string logPath, string message)
        {
            try
            {
                File.AppendAllText(logPath, DateTime.Now.ToString("s") + "  " + message + Environment.NewLine, Utf8NoBom);
            }
            catch (Exception)
            {
            }
        }

        private static void ExtractPayload(string targetDir)
        {
            if (Directory.Exists(targetDir)) Directory.Delete(targetDir, true);
            Directory.CreateDirectory(targetDir);
            for (int i = 0; i < Payload.Paths.Length; i++)
            {
                string relative = Payload.Paths[i].Replace('/', Path.DirectorySeparatorChar);
                string full = Path.Combine(targetDir, relative);
                string parent = Path.GetDirectoryName(full);
                if (!string.IsNullOrEmpty(parent)) Directory.CreateDirectory(parent);
                File.WriteAllBytes(full, Convert.FromBase64String(Payload.Data[i]));
            }
        }

        private static void DeleteTarget(string targetDir)
        {
            string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            if (!targetDir.StartsWith(local, StringComparison.OrdinalIgnoreCase)
                && string.IsNullOrEmpty(Environment.GetEnvironmentVariable("DSH_THEME_SKINS_DIR")))
            {
                return; // never delete an unexpected directory
            }
            if (Directory.Exists(targetDir)) Directory.Delete(targetDir, true);
        }

        private static string Forward(string path)
        {
            return path.Replace('\\', '/');
        }

        private static string LinkPath(string profileDir)
        {
            return Path.Combine(profileDir, "node_modules", "@local", "dsh-theme-skins");
        }

        private static void EnsureJunction(string profileDir, string targetDir)
        {
            Directory.CreateDirectory(Path.Combine(profileDir, "node_modules"));
            Directory.CreateDirectory(Path.Combine(profileDir, "node_modules", "@local"));
            string link = LinkPath(profileDir);
            if (Directory.Exists(link) || File.Exists(link)) RemoveJunction(profileDir);
            int code = RunCmd("mklink /J \"" + link + "\" \"" + targetDir + "\"");
            if (code != 0)
            {
                throw new InvalidOperationException(
                    "无法把插件链接进 profile（mklink 退出码 " + code +
                    "）。请让 Harness 里的 Agent 用 Plugin Manager 的 install_bundle 安装：" + targetDir);
            }
        }

        private static void RemoveJunction(string profileDir)
        {
            string link = LinkPath(profileDir);
            if (Directory.Exists(link) || File.Exists(link)) RunCmd("rmdir \"" + link + "\"");
        }

        internal static int RunCmd(string arguments)
        {
            ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/c " + arguments);
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            using (Process process = Process.Start(psi))
            {
                process.StandardOutput.ReadToEnd();
                process.StandardError.ReadToEnd();
                process.WaitForExit(30000);
                return process.HasExited ? process.ExitCode : -1;
            }
        }

        private static void BackupOnce(string path)
        {
            string backup = path + ".theme-skins.bak";
            if (!File.Exists(backup)) File.Copy(path, backup);
        }

        private static void RestoreBackup(string path)
        {
            string backup = path + ".theme-skins.bak";
            if (File.Exists(backup)) File.Copy(backup, path, true);
        }

        private static void DeleteBackup(string path)
        {
            string backup = path + ".theme-skins.bak";
            if (File.Exists(backup)) File.Delete(backup);
        }
    }

    /// <summary>Locates the Node.js + pnpm pair shipped with the Harness runtime.</summary>
    internal sealed class RuntimePnpm
    {
        internal string NodeExe;
        internal string PnpmScript;

        internal static RuntimePnpm Find(string dshHome)
        {
            List<string> homes = new List<string>();
            string runtimes = Path.Combine(dshHome, "dsh-runtimes");
            if (Directory.Exists(runtimes)) homes.AddRange(Directory.GetDirectories(runtimes));
            string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            homes.Add(Path.Combine(local, "Programs", "DeepSeek Harness", "resources", "runtime"));
            string programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            homes.Add(Path.Combine(programFiles, "DeepSeek Harness", "resources", "runtime"));

            foreach (string home in homes)
            {
                string node = Path.Combine(home, "dependencies", "node", "bin", "node.exe");
                string pnpm = Path.Combine(home, "dependencies", "pnpm", "bin", "pnpm.cjs");
                if (File.Exists(node) && File.Exists(pnpm)) return Create(node, pnpm);

                string node2 = Path.Combine(home, "node", "node.exe");
                string node3 = Path.Combine(home, "bin", "node.exe");
                string pnpm2 = Path.Combine(home, "pnpm", "bin", "pnpm.mjs");
                if (File.Exists(node2) && File.Exists(pnpm2)) return Create(node2, pnpm2);
                if (File.Exists(node3) && File.Exists(pnpm2)) return Create(node3, pnpm2);

                string node4 = Path.Combine(home, "dependencies", "node", "node.exe");
                if (File.Exists(node4) && File.Exists(pnpm2)) return Create(node4, pnpm2);
            }
            return null;
        }

        private static RuntimePnpm Create(string node, string pnpm)
        {
            RuntimePnpm runtime = new RuntimePnpm();
            runtime.NodeExe = node;
            runtime.PnpmScript = pnpm;
            return runtime;
        }

        internal bool PnpmAdd(string profileDir, string targetDir)
        {
            string arguments = Quote(PnpmScript) + " add " + Quote("link:" + targetDir.Replace('\\', '/')) + " --reporter=silent";
            ProcessStartInfo psi = new ProcessStartInfo(NodeExe, arguments);
            psi.WorkingDirectory = profileDir;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            StringBuilder output = new StringBuilder();
            try
            {
                using (Process process = Process.Start(psi))
                {
                    process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs args)
                    {
                        if (args.Data != null) output.AppendLine(args.Data);
                    };
                    process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs args)
                    {
                        if (args.Data != null) output.AppendLine(args.Data);
                    };
                    process.BeginOutputReadLine();
                    process.BeginErrorReadLine();
                    if (!process.WaitForExit(180000))
                    {
                        try { process.Kill(); } catch (Exception) { }
                        return false;
                    }
                    process.WaitForExit();
                    if (process.ExitCode == 0) return true;
                    Installer.SafeAppend(Path.Combine(targetDir, "install.log"), "pnpm output: " + output.ToString());
                    return false;
                }
            }
            catch (Exception error)
            {
                Installer.SafeAppend(Path.Combine(targetDir, "install.log"), "pnpm exception: " + error.Message);
                return false;
            }
        }

        private static string Quote(string value)
        {
            return "\"" + value + "\"";
        }
    }

    /// <summary>Minimal JSON patching for the pretty-printed profile package.json.</summary>
    internal static class JsonPatch
    {
        internal static string ReplaceBundles(string text, string bundleName, bool add)
        {
            int key = text.IndexOf("\"bundles\"", StringComparison.Ordinal);
            if (key < 0)
            {
                if (!add) return text;
                throw new InvalidOperationException("profile package.json 缺少 dsh.profile.bundles 列表。");
            }
            int start = text.IndexOf('[', key);
            int end = start < 0 ? -1 : text.IndexOf(']', start);
            if (start < 0 || end < 0) throw new InvalidOperationException("无法解析 dsh.profile.bundles 列表。");

            string inner = text.Substring(start + 1, end - start - 1);
            List<string> items = new List<string>();
            bool found = false;
            foreach (Match match in Regex.Matches(inner, "\"([^\"]+)\""))
            {
                if (string.Equals(match.Groups[1].Value, bundleName, StringComparison.Ordinal))
                {
                    found = true;
                    if (add) items.Add(match.Value);
                }
                else
                {
                    items.Add(match.Value);
                }
            }
            if (!add && !found) return text;
            if (add && !found) items.Add("\"" + bundleName + "\"");

            string rebuilt;
            if (items.Count == 0)
            {
                rebuilt = "[]";
            }
            else
            {
                rebuilt = "[\n        " + string.Join(",\n        ", items.ToArray()) + "\n      ]";
            }
            return text.Substring(0, start) + rebuilt + text.Substring(end + 1);
        }

        internal static string ReplaceDependency(string text, string packageName, string linkValue, bool add)
        {
            int key = text.IndexOf("\"dependencies\"", StringComparison.Ordinal);
            if (key < 0)
            {
                if (!add) return text;
                int root = text.IndexOf('{');
                if (root < 0) throw new InvalidOperationException("profile package.json 格式无法识别。");
                string block = "\n  \"dependencies\": {\n    \"" + packageName + "\": \"" + linkValue + "\"\n  },";
                return text.Substring(0, root + 1) + block + text.Substring(root + 1);
            }

            int open = text.IndexOf('{', key);
            if (open < 0) throw new InvalidOperationException("profile package.json 的 dependencies 无法解析。");
            int depth = 0;
            int close = -1;
            for (int i = open; i < text.Length; i++)
            {
                if (text[i] == '{') depth++;
                else if (text[i] == '}')
                {
                    depth--;
                    if (depth == 0)
                    {
                        close = i;
                        break;
                    }
                }
            }
            if (close < 0) throw new InvalidOperationException("profile package.json 的 dependencies 无法解析。");

            string inner = text.Substring(open + 1, close - open - 1);
            List<string> entries = new List<string>();
            bool found = false;
            string existingValue = string.Empty;
            foreach (Match match in Regex.Matches(inner, "\"([^\"]+)\"\\s*:\\s*\"([^\"]*)\""))
            {
                if (string.Equals(match.Groups[1].Value, packageName, StringComparison.Ordinal))
                {
                    found = true;
                    existingValue = match.Groups[2].Value;
                    if (add) entries.Add("\"" + packageName + "\": \"" + linkValue + "\"");
                }
                else
                {
                    entries.Add("\"" + match.Groups[1].Value + "\": \"" + match.Groups[2].Value + "\"");
                }
            }
            if (!add && !found) return text;
            if (add && found && string.Equals(existingValue, linkValue, StringComparison.Ordinal)) return text;
            if (add && !found) entries.Add("\"" + packageName + "\": \"" + linkValue + "\"");

            string rebuilt;
            if (entries.Count == 0)
            {
                rebuilt = "{}";
            }
            else
            {
                rebuilt = "{\n    " + string.Join(",\n    ", entries.ToArray()) + "\n  }";
            }
            return text.Substring(0, open) + rebuilt + text.Substring(close + 1);
        }

        internal static bool IsValidJson(string nodeExe, string jsonPath)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo(
                    nodeExe,
                    "-e \"JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))\" \"" + jsonPath + "\"");
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;
                using (Process process = Process.Start(psi))
                {
                    process.StandardOutput.ReadToEnd();
                    process.StandardError.ReadToEnd();
                    process.WaitForExit(30000);
                    return process.HasExited && process.ExitCode == 0;
                }
            }
            catch (Exception)
            {
                return false;
            }
        }
    }

    /// <summary>Tiny WinForms progress window; in silent mode no window is created.</summary>
    internal sealed class InstallerForm : Form
    {
        private readonly bool uninstallMode;
        private readonly Label statusLabel;
        private readonly Label detailLabel;
        private readonly ProgressBar progressBar;
        private readonly Button closeButton;
        private bool running;
        private bool succeeded;
        private string errorMessage = string.Empty;
        private string logPath = string.Empty;

        internal InstallerForm(bool uninstall)
        {
            uninstallMode = uninstall;
            Text = uninstall ? "卸载 DeepSeek Harness 主题皮肤" : "安装 DeepSeek Harness 主题皮肤";
            ClientSize = new Size(580, 270);
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.FromArgb(250, 250, 252);
            Font = new Font("Microsoft YaHei UI", 9f);
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
            catch (Exception) { }

            Label title = new Label();
            title.Text = "DeepSeek Harness · 主题皮肤";
            title.Font = new Font("Microsoft YaHei UI", 15f, FontStyle.Bold);
            title.AutoSize = true;
            title.Location = new Point(24, 20);
            Controls.Add(title);

            detailLabel = new Label();
            detailLabel.AutoSize = false;
            detailLabel.Bounds = new Rectangle(24, 62, 532, 62);
            detailLabel.ForeColor = Color.FromArgb(96, 96, 104);
            detailLabel.Text = uninstall
                ? "将移除主题插件登记、插件链接与安装文件。重启 DeepSeek Harness 后界面恢复默认。"
                : "将把这套主题安装到当前的 DeepSeek Harness（极光 / 夜航 / 北境 / 樱花）。\n" +
                  "安装完成后重启应用，即可在 设置 › 通用 › 主题皮肤 中切换。";
            Controls.Add(detailLabel);

            progressBar = new ProgressBar();
            progressBar.Style = ProgressBarStyle.Marquee;
            progressBar.MarqueeAnimationSpeed = 28;
            progressBar.Bounds = new Rectangle(24, 140, 532, 10);
            Controls.Add(progressBar);

            statusLabel = new Label();
            statusLabel.AutoSize = false;
            statusLabel.Bounds = new Rectangle(24, 160, 532, 42);
            statusLabel.Text = "准备中…";
            Controls.Add(statusLabel);

            closeButton = new Button();
            closeButton.Text = "取消";
            closeButton.Bounds = new Rectangle(468, 216, 88, 32);
            closeButton.Enabled = false;
            closeButton.Click += delegate(object sender, EventArgs args)
            {
                if (running)
                {
                    return;
                }
                if (!succeeded && uninstallMode)
                {
                    Close();
                }
                else
                {
                    Close();
                }
            };
            Controls.Add(closeButton);

            Shown += OnShown;
        }

        private void OnShown(object sender, EventArgs args)
        {
            if (uninstallMode)
            {
                DialogResult answer = MessageBox.Show(
                    this,
                    "确定要卸载 DeepSeek Harness 主题皮肤吗？\n卸载后需要重启应用才能恢复默认界面。",
                    "确认卸载",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question);
                if (answer != DialogResult.Yes)
                {
                    Close();
                    return;
                }
            }
            running = true;
            Thread thread = new Thread(Worker);
            thread.IsBackground = true;
            thread.Start();
        }

        private void Worker()
        {
            try
            {
                InstallReport report = uninstallMode
                    ? Installer.Uninstall(SetStatus)
                    : Installer.Install(SetStatus);
                logPath = report.LogPath;
                succeeded = true;
                PostStatus(report.Summary);
                PostFinished();
            }
            catch (Exception error)
            {
                errorMessage = error.Message;
                PostStatus("安装失败：" + error.Message);
                PostFinished();
            }
        }

        private void SetStatus(string line)
        {
            if (IsDisposed) return;
            BeginInvoke((MethodInvoker)delegate
            {
                statusLabel.Text = line;
            });
        }

        private void PostStatus(string line)
        {
            if (IsDisposed) return;
            BeginInvoke((MethodInvoker)delegate
            {
                statusLabel.Text = line;
            });
        }

        private void PostFinished()
        {
            if (IsDisposed) return;
            BeginInvoke((MethodInvoker)delegate
            {
                running = false;
                progressBar.MarqueeAnimationSpeed = 0;
                progressBar.Visible = false;
                closeButton.Enabled = true;
                closeButton.Text = succeeded ? "完成" : "退出";
                if (!succeeded)
                {
                    string message = "安装失败：\n" + errorMessage;
                    if (!string.IsNullOrEmpty(logPath)) message += "\n\n日志：" + logPath;
                    MessageBox.Show(this, message, "安装失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            });
        }
    }
}
