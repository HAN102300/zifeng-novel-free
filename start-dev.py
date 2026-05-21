#!/usr/bin/env python3
"""
zifeng-novel 开发环境一键启动脚本
启动: zifeng-parser + zifeng-server + Nginx (代理前端 + 反向代理API)
"""

import os
import sys
import subprocess
import platform
import time
import signal
import shutil

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
SYSTEM = platform.system()

# ---- 可配置项 ----
NGINX_PATH = None
NGINX_PORT = "8088"
PARSER_PORT = "3001"
BACKEND_PORT = "8080"

_processes = {}


def print_banner():
    print()
    print("=" * 50)
    print("  zifeng-novel - Dev Environment Start")
    print("=" * 50)
    print()


def find_nginx_dir():
    if NGINX_PATH:
        nginx_exe = os.path.join(NGINX_PATH, "nginx.exe")
        if os.path.isfile(nginx_exe):
            return NGINX_PATH
        print(f"[WARN] 指定的 NGINX_PATH 不存在: {NGINX_PATH}")

    candidates = []
    if SYSTEM == "Windows":
        program_files = os.environ.get("ProgramFiles", "C:\\Program Files")
        candidates = [
            os.path.join(program_files, "nginx"),
            os.path.join(program_files.replace(" (x86)", ""), "nginx"),
            "C:\\nginx",
            "C:\\tools\\nginx",
            "D:\\Java_software\\nginx-1.30.0",
        ]
    elif SYSTEM == "Linux":
        candidates = [
            "/usr/sbin",
            "/usr/local/nginx/sbin",
            "/opt/nginx/sbin",
        ]
    elif SYSTEM == "Darwin":
        candidates = [
            "/usr/local/bin",
            "/opt/homebrew/bin",
            "/opt/local/bin",
        ]

    for d in candidates:
        exe = os.path.join(d, "nginx.exe" if SYSTEM == "Windows" else "nginx")
        if os.path.isfile(exe):
            return d
    return None


def check_command(cmd, name, hint=None):
    if shutil.which(cmd):
        print(f"  [OK] {name} 已安装")
        return True
    print(f"  [ERROR] {name} 未找到，请先安装" + (f" ({hint})" if hint else ""))
    return False


def check_requirements():
    print("[检查] 系统依赖...")
    ok = True
    ok &= check_command("node", "Node.js", "Node.js 18+")
    if ok:
        result = subprocess.run("node --version", shell=True, capture_output=True, text=True)
        print(f"        版本: {result.stdout.strip()}")
    ok &= check_command("java", "Java", "Java 17+")
    if ok:
        result = subprocess.run("java --version", shell=True, capture_output=True, text=True)
        first_line = result.stdout.strip().split("\n")[0] if result.stdout else "unknown"
        print(f"        版本: {first_line}")
    ok &= check_command("mvn", "Maven")
    if ok:
        result = subprocess.run("mvn --version", shell=True, capture_output=True, text=True)
        first_line = result.stdout.strip().split("\n")[0] if result.stdout else "unknown"
        print(f"        版本: {first_line}")

    nginx_dir = find_nginx_dir()
    if nginx_dir:
        nginx_exe = os.path.join(nginx_dir, "nginx.exe" if SYSTEM == "Windows" else "nginx")
        print(f"  [OK] Nginx 已找到: {nginx_exe}")
    else:
        print("  [ERROR] Nginx 未找到，请先安装 Nginx")
        ok = False

    if not ok:
        print("\n[ERROR] 请先安装缺失的依赖")
        input("\n按 Enter 键退出...")
        sys.exit(1)

    return nginx_dir


def confirm_databases():
    print()
    print("[提示] 请确保 MySQL 和 Redis 服务已启动")
    answer = input("确认数据库服务已启动? (y/N): ").strip().lower()
    if answer != "y":
        print("[取消] 请先启动数据库服务")
        input("\n按 Enter 键退出...")
        sys.exit(1)


def run_command(cmd, cwd, name, wait=False):
    print(f"  -> {name} 启动中...")
    if SYSTEM == "Windows":
        proc = subprocess.Popen(
            cmd,
            cwd=cwd,
            shell=True,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
        )
    else:
        proc = subprocess.Popen(
            cmd,
            cwd=cwd,
            shell=True,
            preexec_fn=os.setpgrp if hasattr(os, "setpgrp") else None,
        )
    _processes[name] = proc
    return proc


def build_frontend(name, dir_path):
    print(f"\n[构建] {name}...")
    cwd = os.path.join(PROJECT_ROOT, dir_path)
    if not os.path.isdir(cwd):
        print(f"  [SKIP] 目录不存在: {cwd}")
        return

    node_modules = os.path.join(cwd, "node_modules")
    if not os.path.isdir(node_modules):
        print(f"  -> 安装依赖...")
        subprocess.run("npm install", shell=True, cwd=cwd)

    print(f"  -> 构建中...")
    result = subprocess.run("npm run build", shell=True, cwd=cwd)
    if result.returncode == 0:
        print(f"  [OK] {name} 构建完成")
    else:
        print(f"  [ERROR] {name} 构建失败")
        sys.exit(1)


def generate_nginx_conf(nginx_dir):
    src_conf = os.path.join(PROJECT_ROOT, "deploy", "nginx", "zifeng-local.conf")
    if not os.path.isfile(src_conf):
        print(f"[ERROR] Nginx 配置文件不存在: {src_conf}")
        sys.exit(1)

    with open(src_conf, "r", encoding="utf-8") as f:
        conf_content = f.read()

    project_root_posix = PROJECT_ROOT.replace("\\", "/")
    old_prefixes = [
        "D:/FrontEnd_Project/Repo/zifeng-novel-free",
        "D:/FrontEnd_Project/Repo/zifeng-novel-free2",
    ]
    for prefix in old_prefixes:
        conf_content = conf_content.replace(prefix, project_root_posix)

    dst_conf = os.path.join(nginx_dir, "conf", "zifeng-local.conf")
    with open(dst_conf, "w", encoding="utf-8") as f:
        f.write(conf_content)

    print(f"  -> 配置文件已更新: {dst_conf}")
    return dst_conf


def stop_existing_nginx(nginx_dir):
    nginx_exe = os.path.join(nginx_dir, "nginx.exe" if SYSTEM == "Windows" else "nginx")
    try:
        subprocess.run(
            [nginx_exe, "-s", "quit", "-p", nginx_dir],
            cwd=nginx_dir,
            capture_output=True,
            timeout=5,
        )
    except Exception:
        pass

    if SYSTEM == "Windows":
        subprocess.run("taskkill /f /im nginx.exe 2>nul", shell=True, capture_output=True)
    else:
        subprocess.run("pkill nginx 2>/dev/null", shell=True, capture_output=True)
    time.sleep(0.5)


def start_nginx(nginx_dir):
    print("[1/3] 启动 Nginx (端口 {})...".format(NGINX_PORT))
    nginx_exe = os.path.join(nginx_dir, "nginx.exe" if SYSTEM == "Windows" else "nginx")

    generate_nginx_conf(nginx_dir)

    logs_dir = os.path.join(PROJECT_ROOT, "deploy", "nginx", "logs")
    os.makedirs(logs_dir, exist_ok=True)

    stop_existing_nginx(nginx_dir)

    if SYSTEM == "Windows":
        proc = subprocess.Popen(
            [nginx_exe, "-p", nginx_dir],
            cwd=nginx_dir,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
        )
    else:
        proc = subprocess.Popen(
            [nginx_exe, "-p", nginx_dir],
            cwd=nginx_dir,
            preexec_fn=os.setpgrp if hasattr(os, "setpgrp") else None,
        )
    time.sleep(1)
    print("  [OK] Nginx 已启动")


def start_parser():
    print("[2/3] 启动解析引擎 (端口 {})...".format(PARSER_PORT))
    parser_dir = os.path.join(PROJECT_ROOT, "zifeng-parser")
    if not os.path.isdir(parser_dir):
        print("  [SKIP] 目录不存在: zifeng-parser")
        return

    node_modules = os.path.join(parser_dir, "node_modules")
    if not os.path.isdir(node_modules):
        print("  -> 安装依赖...")
        subprocess.run("npm install", shell=True, cwd=parser_dir)

    run_command("npm start", parser_dir, "zifeng-parser")
    time.sleep(1.5)
    print("  [OK] 解析引擎已启动")


def start_backend():
    print("[3/3] 启动 SpringBoot 后端 (端口 {})...".format(BACKEND_PORT))
    server_dir = os.path.join(PROJECT_ROOT, "zifeng-server")
    if not os.path.isdir(server_dir):
        print("  [SKIP] 目录不存在: zifeng-server")
        return

    run_command("mvn spring-boot:run -q", server_dir, "zifeng-server")


def show_info():
    print()
    print("=" * 50)
    print("  所有服务启动完成!")
    print("=" * 50)
    print()
    print("  访问地址:")
    print("    综合入口: http://localhost:{}".format(NGINX_PORT))
    print("    用户前端: http://localhost:{}/".format(NGINX_PORT))
    print("    管理后台: http://localhost:{}/admin/".format(NGINX_PORT))
    print("    API 接口: http://localhost:{}/api/".format(NGINX_PORT))
    print("    Nginx健康: http://localhost:{}/nginx-health".format(NGINX_PORT))
    print()
    print("  后台服务:")
    print("    Parser:    http://localhost:{}/api/search".format(NGINX_PORT))
    print("    Backend:   http://localhost:{}/api/auth/".format(NGINX_PORT))
    print()
    print("  停止服务: python stop-dev.py")
    print()


def cleanup(signum=None, frame=None):
    print("\n\n[停止] 正在停止所有服务...")
    stop_script = os.path.join(PROJECT_ROOT, "stop-dev.py")
    subprocess.run([sys.executable, stop_script], cwd=PROJECT_ROOT)
    sys.exit(0)


def main():
    os.chdir(PROJECT_ROOT)
    print_banner()

    nginx_dir = check_requirements()
    confirm_databases()

    build_frontend("zifeng-web", "zifeng-web")
    build_frontend("zifeng-admin", "zifeng-admin")

    start_nginx(nginx_dir)
    start_parser()
    start_backend()

    show_info()

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()