import subprocess

def is_up_to_date():
    try:
        # fetch remote changes
        subprocess.run(["git", "fetch"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        # check if local is behind remote
        local_sha = subprocess.check_output(["git", "rev-parse", "@"]).decode('utf-8').strip()
        remote_sha = subprocess.check_output(["git", "rev-parse", "@{u}"]).decode('utf-8').strip()
        base_sha = subprocess.check_output(["git", "merge-base", "@", "@{u}"]).decode('utf-8').strip()

        if local_sha == remote_sha:
            return True  # up to date
        elif local_sha == base_sha:
            return False  # need pull
        else:
            print("⚠️ 로컬이 변경된 상태입니다. 자동 pull이 위험할 수 있습니다.")
            return None
    except subprocess.CalledProcessError as e:
        print(f"Git 명령 실행 중 오류 발생: {e}")
        return None

def auto_pull():
    try:
        status = is_up_to_date()
        if status is False:
            print("🔄 변경사항이 있으므로 git pull을 진행합니다.")
            subprocess.run(["git", "pull"], check=True)
        elif status is True:
            print("✅ 이미 최신 버전입니다.")
        else:
            print("❌ 자동 pull을 진행하지 않습니다.")
    except Exception as e:
        print(f"에러 발생: {e}") 