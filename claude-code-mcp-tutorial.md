# Claude Code에 MCP 서버 연결하기

## 시작하기 전에

당신은 Claude Code를 사용하고 있다. 어느 날, Notion 데이터를 Claude가 직접 읽어오면 좋겠다는 생각이 든다. 또는 Airtable의 데이터베이스를 Claude가 조회하고 수정할 수 있다면? 이것이 바로 MCP가 해결하는 문제다.

---

## Chapter 1: MCP란 무엇인가

MCP(Model Context Protocol)는 Claude Code와 외부 서비스를 연결하는 다리다.

```
[Claude Code] <--MCP--> [Notion]
             <--MCP--> [Airtable]
             <--MCP--> [GitHub]
             <--MCP--> [당신이 만든 서버]
```

MCP 서버를 연결하면, Claude Code가 해당 서비스의 도구를 마치 자신의 것처럼 사용할 수 있다.

---

## Chapter 2: 첫 번째 MCP 서버 연결하기

### 상황: Airtable MCP 서버를 연결하고 싶다

터미널을 열고 다음 명령어를 입력한다:

```bash
claude mcp add --transport stdio airtable \
  --env AIRTABLE_API_KEY=your_api_key_here \
  -- npx -y airtable-mcp-server
```

무슨 일이 일어났는가?

1. `claude mcp add` - MCP 서버를 추가하겠다고 선언
2. `--transport stdio` - 로컬에서 프로세스로 실행하는 방식 선택
3. `airtable` - 이 서버의 이름을 "airtable"로 지정
4. `--env AIRTABLE_API_KEY=...` - API 키를 환경변수로 전달
5. `-- npx -y airtable-mcp-server` - 실제로 실행할 명령어

### 확인하기

Claude Code 안에서 `/mcp`를 입력한다:

```
/mcp
```

연결된 서버 목록이 보인다. "airtable"이 있다면 성공이다.

---

## Chapter 3: 원격 서버 연결하기

### 상황: Notion 공식 MCP 서버를 연결하고 싶다

Notion은 원격 HTTP 서버를 제공한다:

```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

이번엔 더 간단하다. 원격 서버는 이미 어딘가에서 실행 중이므로, URL만 알려주면 된다.

### OAuth 인증이 필요한 경우

1. 위 명령어 실행
2. Claude Code에서 `/mcp` 입력
3. 브라우저가 자동으로 열린다
4. Notion 로그인 후 권한 승인
5. 끝. 토큰은 자동 저장된다.

---

## Chapter 4: 설정 파일 직접 만들기

명령어가 번거롭다면, 설정 파일을 직접 작성할 수 있다.

### 프로젝트 전용 설정

프로젝트 루트에 `.mcp.json` 파일을 생성한다:

```json
{
  "mcpServers": {
    "notion": {
      "type": "http",
      "url": "https://mcp.notion.com/mcp"
    },
    "airtable": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "airtable-mcp-server"],
      "env": {
        "AIRTABLE_API_KEY": "your_api_key"
      }
    }
  }
}
```

이 설정은 해당 프로젝트에서만 적용된다.

### 전역 설정

모든 프로젝트에서 사용하려면 `~/.claude.json`을 수정한다:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://mcp.github.com/mcp"
    }
  }
}
```

---

## Chapter 5: 환경 변수로 비밀 관리하기

API 키를 설정 파일에 직접 쓰는 건 위험하다. 환경 변수를 활용하자:

```json
{
  "mcpServers": {
    "airtable": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "airtable-mcp-server"],
      "env": {
        "AIRTABLE_API_KEY": "${AIRTABLE_API_KEY}"
      }
    }
  }
}
```

`${AIRTABLE_API_KEY}`는 시스템 환경 변수에서 값을 가져온다.

기본값도 지정할 수 있다:

```json
"url": "${API_URL:-https://default.example.com}/mcp"
```

`API_URL`이 없으면 `https://default.example.com`을 사용한다.

---

## Chapter 6: 문제가 생겼을 때

### 연결이 안 된다

```bash
# 전체 진단 실행
claude /doctor

# MCP 상태만 확인
/mcp
```

### 서버를 제거하고 싶다

```bash
claude mcp remove airtable
```

### 서버 상세 정보 확인

```bash
claude mcp get airtable
```

### 등록된 모든 서버 목록

```bash
claude mcp list
```

---

## 마무리

이제 당신은 Claude Code에 원하는 MCP 서버를 연결할 수 있다.

1. **원격 서버**: `claude mcp add --transport http <이름> <URL>`
2. **로컬 서버**: `claude mcp add --transport stdio <이름> -- <명령어>`
3. **설정 파일**: `.mcp.json` 또는 `~/.claude.json`

MCP 생태계는 계속 성장하고 있다. 필요한 서비스의 MCP 서버가 있는지 검색해보고, 없다면 직접 만들어볼 수도 있다.

---

## 참고

- [Claude Code MCP 공식 문서](https://code.claude.com/docs/en/mcp)
- [MCP 프로토콜 명세](https://modelcontextprotocol.io)
