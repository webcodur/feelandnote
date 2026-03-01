# 05. 장비 시스템

## 핵심 원칙

원작(수호전 천도 108성)의 수량제 장비 시스템을 따른다.
콘텐츠 기반 아이템(두루마리/보물) 시스템은 **폐기**되었다.

---

## 장비 4종

| 장비 | 아이콘 | 범위 | 효과 |
|------|--------|------|------|
| **무기** (weapons) | ⚔️ | 0~10,000 | 공격력 보정 (최대 +30%) |
| **군마** (horses) | 🐎 | 0~1,000 | 돌격 전술 시 보정 (최대 +20%) |
| **조선** (ships) | ⛵ | 0~1,000 | 수상전 보정 (미구현) |
| **부적** (charms) | 📿 | 0~1,000 | 계략/화공 방어 보정 (최대 -30% 피해) |

---

## 장비 소유 구조

### 세력 재고 (`Faction.resources`)

세력 단위로 장비를 보유한다. `Resources` 인터페이스에 포함.

```typescript
interface Resources {
  gold: number; food: number; knowledge: number; material: number; troops: number;
  weapons: number; horses: number; ships: number; charms: number;
}
```

### 캐릭터 개인 장비 (`GameCharacter.equipment`)

캐릭터 개인에게 배분된 장비. 전투 시 보정에 사용.

```typescript
interface TroopEquipment {
  weapons: number;   // 0~10,000
  horses: number;    // 0~1,000
  ships: number;     // 0~1,000
  charms: number;    // 0~1,000
}
```

---

## 장비 흐름

```
생산 (무기고)  →  세력 재고  →  배분 (commandEquip)  →  캐릭터 장비
구매 (금/재료) →  세력 재고  →  배분                  →  캐릭터 장비
```

### 생산

- **무기고** (`armory`) 건물이 매 턴 무기 생산
- 기본 생산량: 100/3 ≈ 33 (10일분)
- 담당관 배치 시: ×1.5

### 구매 비용

| 장비 | 금 | 재료 |
|------|-----|------|
| 무기 (1단위) | 2 | 1 |
| 군마 (1단위) | 5 | 0 |
| 조선 (1단위) | 8 | 3 |
| 부적 (1단위) | 3 | 0 |

### 배분

`commandEquip(state, factionId, charId, type, amount)` — 세력 재고에서 캐릭터로 이전.

### AI 자동 분배

AI 세력은 매 턴 `aiDistributeEquipment()`로 재고를 등급순(totalScore 내림차순) 멤버에게 균등 분배.

---

## 전투 보정

### 근접 공격 (무기)

```
weaponMod = 1 + weapons / 10000 × 0.3
대미지 × weaponMod
```

→ 무기 10,000 = +30% 공격력

### 돌격 (군마)

```
horseMod = 1 + horses / 1000 × 0.2
돌격 대미지 × horseMod
```

→ 군마 1,000 = +20% 돌격 대미지

### 계략/화공 방어 (부적)

```
charmResist = 1 - charms / 1000 × 0.3
계략/화공 피해 × charmResist
```

→ 부적 1,000 = -30% 피해

### 레거시 전술 (6전술 상성)

`calcTacticDamage()`에도 동일한 보정 적용:
- 무기: `weapons/10000 × 0.3` → 공격력 +
- 군마: 돌격 전술 시 `horses/1000 × 0.2` → 대미지 +
- 부적: 계략/화공 대상 시 `charms/1000 × 0.3` → 피해 -

---

## UI 표시

### CharacterInfoPanel — 소유물 탭

4종 장비를 프로그레스 바로 표시:

```
⚔️ 무기   1,500/10,000  ████░░░░░░
🐎 군마     300/1,000   ███░░░░░░░
⛵ 조선       0/1,000   ░░░░░░░░░░
📿 부적     500/1,000   █████░░░░░
```

---

## 코드 위치

| 파일 | 내용 |
|------|------|
| `types.ts` | `TroopEquipment`, `Resources` 정의 |
| `constants.ts` | `EQUIPMENT_MAX`, `EQUIPMENT_LABELS`, `EQUIPMENT_COST` |
| `utils.ts` | `calcTacticDamage()` 장비 보정 |
| `battleEngine.ts` | `calcMeleeDamage()`, `calcStratagemDamage()`, `executeSkill()` 장비 보정 |
| `turnEngine.ts` | `generateResources()` 무기고 생산, `commandEquip()` 배분 |
| `aiTurn.ts` | `aiDistributeEquipment()` AI 자동 분배 |
| `CharacterInfoPanel.tsx` | 4종 장비 바 UI |
