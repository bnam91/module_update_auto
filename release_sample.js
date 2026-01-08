import dotenv from 'dotenv';
import ReleaseUpdater from './release_updater.js';

dotenv.config();

async function main() {
    try {
        // 방법 1: 자동 감지 (현재 Git 저장소에서 owner/repo 자동 감지)
        // const updater = await ReleaseUpdater.create();
        
        // 방법 2: 환경 변수 사용 (GITHUB_OWNER, GITHUB_REPO)
        // const updater = new ReleaseUpdater();
        
        // 방법 3: 명시적 설정
        const updater = new ReleaseUpdater({
            owner: process.env.GITHUB_OWNER || "bnam91",
            repo: process.env.GITHUB_REPO || "module_update_auto",
            // silent: true,  // 로그 출력 비활성화
            // onBeforeUpdate: async (releaseInfo) => {
            //     console.log('업데이트 전 작업...');
            // },
            // onAfterUpdate: async (releaseInfo) => {
            //     console.log('업데이트 후 작업...');
            // }
        });
        
        // 방법 4: 기존 방식 (하위 호환성)
        // const updater = new ReleaseUpdater(owner, repo);
        
        const updateSuccess = await updater.updateToLatest();
        
        if (updateSuccess) {
            console.log("프로그램을 실행합니다...");
        } else {
            console.log("업데이트 실패, 이전 버전으로 계속 진행합니다...");
        }
        
        // 업데이트 결과와 상관없이 실행되는 코드
        runProgram();
        
    } catch (error) {
        console.error(`예상치 못한 오류 발생: ${error.message}`);
        // 중요한 예외는 로깅하거나 오류 보고 시스템에 전송할 수 있음
    }
}

function runProgram() {
    // 실제 프로그램 코드를 별도 함수로 분리
    console.log("Hello, GitHub!");
}

main();

