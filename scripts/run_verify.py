import subprocess, sys, time

def run_command(desc, cmd, cwd=None):
    print(f"--> [VERIFY] {desc}...")
    start = time.time()
    res = subprocess.run(cmd, shell=True, cwd=cwd)
    duration = time.time() - start
    if res.returncode != 0:
        print(f"FAILED: {desc} (took {duration:.2f}s)")
        sys.exit(res.returncode)
    print(f"[OK] {desc} passed in {duration:.2f}s")
    return duration

def main():
    total_start = time.time()
    print("==================================================")
    print("         TOEIC PLATFORM VERIFY SUITE              ")
    print("==================================================")

    # 1. Typecheck and build frontend
    run_command("Frontend TypeScript & Vite Build", "npm run build", cwd="frontend")

    # 2. Frontend Vitest unit & regression tests
    run_command("Frontend Unit & Regression Tests (Vitest)", "npx vitest run", cwd="frontend")

    # 3. Data Integrity Tests
    run_command("Data Integrity & Anti-Mojibake Guard Tests", "python scripts/run_data_tests.py")

    # 4. Manifest routes verification
    run_command("Features Manifest & Route Contract Test", "python scripts/test_manifest.py")

    total_duration = time.time() - total_start
    print("==================================================")
    print(f"VERIFY SUCCESSFUL! Total time: {total_duration:.2f}s")
    print("==================================================")

if __name__ == '__main__':
    main()
