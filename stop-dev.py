#!/usr/bin/env python3
"""
zifeng-novel 开发环境一键停止脚本
停止: Nginx + zifeng-parser + zifeng-server + 清理端口
"""

import os
import sys
import subprocess
import platform
import time
import shutil

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
SYSTEM = platform.system()

NGINX_PORT = "8088"
PARSER_PORT = "3001"
BACKEND_PORT = "8080"
SERVICE_PORTS = [NGINX_PORT, PARSER_PORT, BACKEND_PORT]

# 需要清理的进程关键词（更精确匹配，避免误杀无关进程）
PROCESS_KILL_PATTERNS = {
    "node": ["zifeng-parser"],       # 匹配 parser 工作目录而非所有 node 进程
    "java": ["zifeng-server"],       # 匹配 server 工作目录而非所有 java 进程
    "nginx": ["nginx"],
}


def print_banner():
    print()
    print("=" * 50)
    print("  zifeng-novel - Stop All Services")
    print("=" * 50)
    print()


def find_nginx_dir():
    candidates = []
    if SYSTEM == "Windows":
        program_files = os.environ.get("ProgramFiles", "C:\\Program Files")
        # 优先从环境变量 NGINX_HOME 获取
        nginx_home = os.environ.get("NGINX_HOME", "")
        if nginx_home:
            candidates.append(nginx_home)
        candidates.extend([
            os.path.join(program_files, "nginx"),
            os.path.join(program_files.replace(" (x86)", ""), "nginx"),
            "C:\\nginx",
            "C:\\tools\\nginx",
        ])
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


def stop_nginx():
    print("[1/3] 停止 Nginx...")
    nginx_dir = find_nginx_dir()
    stopped = False

    if nginx_dir:
        nginx_exe = os.path.join(nginx_dir, "nginx.exe" if SYSTEM == "Windows" else "nginx")
        try:
            subprocess.run(
                [nginx_exe, "-s", "quit", "-p", nginx_dir],
                cwd=nginx_dir,
                capture_output=True,
                timeout=5,
            )
            stopped = True
        except Exception:
            pass

    if SYSTEM == "Windows":
        result = subprocess.run(
            "taskkill /f /im nginx.exe 2>nul",
            shell=True,
            capture_output=True,
        )
        if result.returncode == 0:
            stopped = True
    else:
        result = subprocess.run(
            "pkill nginx 2>/dev/null",
            shell=True,
            capture_output=True,
        )
        if result.returncode == 0:
            stopped = True

    if stopped:
        print("  [OK] Nginx 已停止")
    else:
        print("  [INFO] Nginx 未在运行")


def kill_processes_by_name(names, label):
    """通过进程名关键词终止进程（使用 -f 参数匹配命令行，更精确）"""
    killed = False
    if SYSTEM == "Windows":
        for name in names:
            # 使用 /fi "WINDOWTITLE eq" 或 WMIC 按命令行匹配，更精确
            result = subprocess.run(
                f'wmic process where "CommandLine like \'%{name}%\'" call terminate 2>nul',
                shell=True,
                capture_output=True,
            )
            if result.returncode == 0:
                killed = True
    else:
        for name in names:
            result = subprocess.run(
                f"pkill -f {name} 2>/dev/null",
                shell=True,
                capture_output=True,
            )
            if result.returncode == 0:
                killed = True
    if killed:
        print(f"  [OK] {label} 相关进程已终止")


def kill_processes_by_port(ports, label):
    killed = False
    for port in ports:
        if SYSTEM == "Windows":
            result = subprocess.run(
                f'for /f "tokens=5" %a in (\'netstat -aon ^| findstr ":{port} " ^| findstr "LISTENING"\') do @taskkill /f /pid %a 2>nul',
                shell=True,
                capture_output=True,
            )
            if result.returncode == 0:
                killed = True
        else:
            result = subprocess.run(
                f"lsof -ti:{port} 2>/dev/null | xargs kill -9 2>/dev/null",
                shell=True,
                capture_output=True,
            )
            if result.returncode == 0:
                killed = True
    if killed:
        print(f"  [OK] {label} 端口进程已清理")


def stop_all():
    print_banner()

    stop_nginx()

    print("[2/3] 停止后端服务...")
    kill_processes_by_name(PROCESS_KILL_PATTERNS["node"], "Node.js")
    kill_processes_by_name(PROCESS_KILL_PATTERNS["java"], "Java/SpringBoot")
    time.sleep(1)

    print("[3/3] 清理残留端口进程...")
    kill_processes_by_port(SERVICE_PORTS, "开发端口")
    time.sleep(0.5)

    print()
    print("=" * 50)
    print("  所有服务已停止")
    print("=" * 50)
    print()


if __name__ == "__main__":
    stop_all()