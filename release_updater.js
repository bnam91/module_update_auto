import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class ReleaseUpdater {
    constructor(options = {}) {
        // 옵션 파싱: 기존 방식(owner, repo) 또는 객체 방식 지원
        if (typeof options === 'string' || (options && !options.owner)) {
            // 기존 방식: constructor(owner, repo, versionFile)
            const owner = typeof options === 'string' ? options : arguments[0];
            const repo = typeof options === 'string' ? arguments[1] : arguments[1];
            const versionFile = arguments[2] || "VERSION.txt";
            this.owner = owner;
            this.repo = repo;
            this.versionFile = versionFile;
            this.silent = false;
        } else {
            // 새로운 방식: constructor({ owner, repo, versionFile, ... })
            this.owner = options.owner;
            this.repo = options.repo;
            this.versionFile = options.versionFile || "VERSION.txt";
            this.silent = options.silent || false;
            this.onBeforeUpdate = options.onBeforeUpdate;
            this.onAfterUpdate = options.onAfterUpdate;
        }

        // 설정 파일 로드
        this.config = this.loadConfig();
        
        // 설정 파일에서 owner/repo 읽기
        if (this.config?.owner && !this.owner) this.owner = this.config.owner;
        if (this.config?.repo && !this.repo) this.repo = this.config.repo;
        
        // 환경 변수에서 읽기
        if (!this.owner) this.owner = process.env.GITHUB_OWNER;
        if (!this.repo) this.repo = process.env.GITHUB_REPO;
        
        // 초기화 완료 여부 플래그 (자동 감지 필요 시 true로 설정)
        this._initialized = !!(this.owner && this.repo);
        
        if (this.owner && this.repo) {
            this.apiUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`;
        }
        this.token = process.env.GITHUB_TOKEN || this.config?.token;
    }

    // 정적 팩토리 메서드: 자동 감지가 필요한 경우 사용
    static async create(options = {}) {
        const updater = new ReleaseUpdater(options);
        if (!updater._initialized) {
            await updater.initializeRepoInfo();
        }
        return updater;
    }

    loadConfig() {
        const configFiles = ['.release-updater.json', 'release-updater.config.json'];
        for (const configFile of configFiles) {
            if (fs.existsSync(configFile)) {
                try {
                    return JSON.parse(fs.readFileSync(configFile, 'utf8'));
                } catch (error) {
                    this.log('설정 파일 읽기 오류:', error.message);
                }
            }
        }
        return null;
    }

    async initializeRepoInfo() {
        // 자동 감지
        if (!this.owner || !this.repo) {
            const repoInfo = await this.detectGitRepo();
            if (repoInfo) {
                this.owner = this.owner || repoInfo.owner;
                this.repo = this.repo || repoInfo.repo;
            }
        }

        if (!this.owner || !this.repo) {
            throw new Error('GitHub owner와 repo를 찾을 수 없습니다. 설정 파일, 환경 변수 또는 Git 원격 저장소를 확인해주세요.');
        }

        this.apiUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`;
        this._initialized = true;
    }

    async detectGitRepo() {
        try {
            const remoteUrl = await this.executeCommand('git config --get remote.origin.url');
            if (!remoteUrl) return null;

            // https://github.com/owner/repo.git 또는 git@github.com:owner/repo.git 형식 파싱
            const match = remoteUrl.trim().match(/(?:https:\/\/github\.com\/|git@github\.com:)([^\/]+)\/([^\/\.]+)(?:\.git)?/);
            if (match) {
                return {
                    owner: match[1],
                    repo: match[2]
                };
            }
            return null;
        } catch (error) {
            this.log('Git 저장소 감지 실패:', error.message);
            return null;
        }
    }

    log(...args) {
        if (!this.silent) {
            console.log(...args);
        }
    }

    async getLatestRelease() {
        try {
            const headers = {
                'Accept': 'application/vnd.github.v3+json'
            };
            
            if (this.token) {
                headers['Authorization'] = `token ${this.token}`;
            }
            
            const response = await axios.get(this.apiUrl, { headers });
            const releaseData = response.data;
            return {
                tag_name: releaseData.tag_name,
                name: releaseData.name,
                published_at: releaseData.published_at,
                body: releaseData.body,
                assets: releaseData.assets
            };
        } catch (error) {
            if (!this.silent) {
                console.error('GitHub API 요청 중 오류 발생:', error.message);
                if (error.response) {
                    console.error('상세 에러 정보:', {
                        status: error.response.status,
                        statusText: error.response.statusText,
                        data: error.response.data
                    });
                }
            }
            return null;
        }
    }

    getCurrentVersion() {
        try {
            if (!fs.existsSync(this.versionFile)) {
                return null;
            }
            const versionInfo = JSON.parse(fs.readFileSync(this.versionFile, 'utf8'));
            return versionInfo.tag_name;
        } catch (error) {
            if (!this.silent) {
                console.error('버전 파일 읽기 오류:', error.message);
            }
            return null;
        }
    }

    saveVersionInfo(releaseInfo) {
        try {
            fs.writeFileSync(
                this.versionFile,
                JSON.stringify(releaseInfo, null, 2),
                'utf8'
            );
            return true;
        } catch (error) {
            if (!this.silent) {
                console.error('버전 정보 저장 중 오류 발생:', error.message);
            }
            return false;
        }
    }

    async updateToLatest() {
        // 초기화 확인
        if (!this._initialized) {
            await this.initializeRepoInfo();
        }

        const currentVersion = this.getCurrentVersion();
        const latestRelease = await this.getLatestRelease();

        if (!latestRelease) {
            this.log('❌ 최신 릴리즈 정보를 가져올 수 없습니다.');
            return false;
        }

        const latestVersion = latestRelease.tag_name;

        if (currentVersion === null) {
            this.log(`⚠️ 첫 실행: 최신 버전 ${latestVersion}을 설치합니다.`);
            return await this.performUpdate(latestRelease);
        } else if (currentVersion !== latestVersion) {
            this.log(`🔄 업데이트 필요: ${currentVersion} → ${latestVersion}`);
            return await this.performUpdate(latestRelease);
        } else {
            this.log(`✅ 이미 최신 버전입니다: ${currentVersion}`);
            return true;
        }
    }

    async performUpdate(releaseInfo) {
        try {
            // 업데이트 전 훅 실행
            if (this.onBeforeUpdate) {
                await this.onBeforeUpdate(releaseInfo);
            }

            // Git으로 최신 릴리즈 태그 체크아웃
            this.log('🔄 Git 태그 가져오는 중...');
            await this.executeCommand('git fetch --tags');
            
            this.log(`🔄 버전 ${releaseInfo.tag_name}으로 체크아웃 중...`);
            await this.executeCommand(`git checkout ${releaseInfo.tag_name}`);

            // 버전 정보 저장
            this.saveVersionInfo(releaseInfo);

            this.log(`✅ 버전 ${releaseInfo.tag_name}으로 업데이트 완료`);

            // 업데이트 후 추가 작업
            await this.postUpdateActions();

            // 업데이트 후 훅 실행
            if (this.onAfterUpdate) {
                await this.onAfterUpdate(releaseInfo);
            }

            return true;
        } catch (error) {
            if (!this.silent) {
                console.error('Git 명령 실행 중 오류 발생:', error.message);
            }
            return false;
        }
    }

    async postUpdateActions() {
        if (fs.existsSync('package.json')) {
            try {
                this.log('📦 의존성 패키지 설치 중...');
                await this.executeCommand('npm install');
            } catch (error) {
                if (!this.silent) {
                    console.error('의존성 설치 중 오류 발생:', error.message);
                }
            }
        }
    }

    executeCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(stdout);
            });
        });
    }
}

export default ReleaseUpdater;