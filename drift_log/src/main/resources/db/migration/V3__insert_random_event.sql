-- =============================================
-- V3 : 랜덤 이벤트 초기 데이터 (5개)
-- 현재 로컬 static 경로 사용 중
-- S3 세팅 완료 후 URL 교체 필요
-- trigger_weather NULL = 날씨 무관 발생
-- image_url NULL = 텍스트만 표시
-- =============================================

INSERT INTO random_event (id, name, trigger_weather, cooldown_minutes, text, image_url, created_at, updated_at)
VALUES
    (
        1,
        '먼 고래 그림자',
        NULL,
        20,
        '수면 아래로 거대한 그림자가 천천히 지나간다. 오래 바라보았지만 다시 나타나지 않았다.',
        NULL,
        NOW(),
        NOW()
    ),
    (
        2,
        '붉은 달',
        NULL,
        30,
        '구름 사이로 붉게 물든 달이 모습을 드러냈다. 바다도 같은 빛으로 물들었다.',
        '/event/red_moon.png',
        NOW(),
        NOW()
    ),
    (
        3,
        '안개',
        '흐림',
        15,
        '짙은 안개가 수평선을 지웠다. 배가 어디쯤 있는지 알 수 없었다. 그래도 앞으로 나아갔다.',
        NULL,
        NOW(),
        NOW()
    ),
    (
        4,
        '물 위 간판',
        NULL,
        25,
        '파도에 흔들리는 낡은 간판이 보였다. 글씨는 반쯤 지워져 읽을 수 없었다.',
        '/event/floating_sign.png',
        NOW(),
        NOW()
    ),
    (
        5,
        '희미한 도시 불빛',
        NULL,
        20,
        '수평선 너머로 아주 희미한 불빛이 깜빡였다. 누군가 아직 거기 있는 것일까.',
        NULL,
        NOW(),
        NOW()
    );