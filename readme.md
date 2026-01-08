# GitHub Release 자동 업데이트 모듈

## 설명

### 초기 설정

서브모듈을 처음 사용할 때는 **별도로 파일을 만들 필요가 없습니다**. 

프로그램을 실행하면 자동으로:
1. 최신 릴리즈 정보를 GitHub에서 가져옵니다
2. 버전 파일이 없으면 자동으로 생성합니다
3. 디렉토리도 필요시 자동으로 생성합니다

**자동 생성되는 파일:**
- `VERSION.txt` - 메인 프로젝트 버전 (프로젝트 루트)
- `SUBMODULE_VERSION.txt` - 서브모듈 버전 (서브모듈 내부)

**템플릿 파일 (참고용):**
- `VERSION.txt.example` - 메인 프로젝트 버전 템플릿
- `SUBMODULE_VERSION.txt.example` - 서브모듈 버전 템플릿

### 버전 파일 구조

- **`SUBMODULE_VERSION.txt`**: 서브모듈 자체의 버전을 추적합니다.
  - 위치: `프로젝트 루트/submodules/module_update_auto/SUBMODULE_VERSION.txt`
  - 용도: 서브모듈(`bnam91/module_update_auto`)의 릴리즈 버전 관리
  - 레포지토리: 고정 (`bnam91/module_update_auto`)

- **`VERSION.txt`**: 메인 프로젝트의 버전을 추적합니다. 
  - 위치: `프로젝트 루트/VERSION.txt`
  - 용도: 메인 프로젝트의 릴리즈 버전 관리
  - 레포지토리: 메인 프로젝트의 GitHub 레포지토리

### 프로젝트 구조

```
프로젝트 루트/
├── VERSION.txt                    # 메인 프로젝트 버전
├── package.json
├── submodules/
│   └── module_update_auto/
│       ├── SUBMODULE_VERSION.txt  # 서브모듈 버전
│       ├── config.js
│       ├── release_updater.js
│       └── release_updater_check.js
```

## 사용법

### 서브모듈 버전 체크

```javascript
import ReleaseUpdater from './submodules/module_update_auto/release_updater.js';
import config from './submodules/module_update_auto/config.js';

const updater = new ReleaseUpdater(
    "bnam91", 
    "module_update_auto", 
    config.submoduleVersionFile
);
await updater.updateToLatest();
```

### 메인 프로젝트 버전 체크

```javascript
import ReleaseUpdater from './submodules/module_update_auto/release_updater.js';
import config from './submodules/module_update_auto/config.js';

const updater = new ReleaseUpdater(
    "your-org", 
    "your-main-repo", 
    config.versionFile
);
await updater.updateToLatest();
```

## 서브모듈 의존성 설치

프로젝트 루트의 `package.json`에서 서브모듈의 `node_modules`도 함께 설치하도록 설정:

```json
{
  "scripts": {
    "install:all": "npm install && cd submodules/module_update_auto && npm install"
  }
}
```

또는 더 간단하게:

```json
{
  "scripts": {
    "postinstall": "cd submodules/module_update_auto && npm install"
  }
}
```

`postinstall` 스크립트는 `npm install` 실행 후 자동으로 실행됩니다.

## 설정

`config.js`에서 경로를 수정할 수 있습니다:

```javascript
// 프로젝트 루트 경로 (상대 경로 또는 절대 경로)
const PROJECT_ROOT = '../../';

// 서브모듈 이름
const SUBMODULE_NAME = 'module_update_auto';
```