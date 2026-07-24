# Mobile telemetry contract

모바일 송출기가 2초 간격으로 전송하는 확장 텔레메트리 계약입니다.

## Endpoint

```text
POST /api/telemetry/
Authorization: Bearer <access token>
Content-Type: application/json
```

## Payload

```json
{
  "uuid": "CID001",
  "epochTime": 42,
  "capturedAt": "2026-07-24T00:40:00.000Z",
  "userAgent": "Mozilla/5.0 (...) Android ... Chrome/...",
  "location": {
    "latitude": 37.123456,
    "longitude": 127.123456,
    "altitude": 34.2,
    "accuracy": 8.0,
    "speed": 2.4,
    "heading": 142.0
  },
  "orientation": {
    "alpha": 141.8,
    "beta": -4.2,
    "gamma": 1.7,
    "absolute": false
  },
  "battery": {
    "supported": true,
    "level": 0.72,
    "charging": false
  }
}
```

`location`, `orientation`, `battery` 내부 값은 기기 또는 권한 상태에 따라 `null`일 수
있습니다. 서버는 알려지지 않은 센서가 없다는 이유로 전체 요청을 거절하지 않아야 합니다.

## Backend work

1. 기존 `TelemetryCreate`가 중첩된 모바일 센서 필드를 수용하도록 DTO를 확장합니다.
2. 최신 상태 테이블에는 장비별 마지막 위치·기울기·배터리를 upsert합니다.
3. 이력 테이블에는 `capturedAt` 기준으로 원본 값을 저장합니다.
4. `uuid`에 대한 publish 권한과 telemetry write 권한을 동일하게 검사합니다.
5. 위치 데이터는 운영 로그에 원문으로 남기지 않습니다.
6. 클라이언트 시간이 서버 시간과 크게 다르면 수신 시간도 함께 보존합니다.
7. 과도한 전송을 막기 위해 장비별 rate limit을 적용하되 2초 주기는 허용합니다.
