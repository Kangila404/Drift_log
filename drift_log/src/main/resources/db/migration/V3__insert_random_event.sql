-- =============================================
-- V3 : 랜덤 이벤트 초기 데이터 (5개)
-- image_url : /event/ 하위 이미지 사용
-- trigger_weather NULL = 날씨 무관 발생
-- =============================================

INSERT INTO random_event (id, name, trigger_weather, cooldown_minutes, text, image_url, created_at, updated_at)
VALUES
    (
        1,
        '먼 고래 그림자',
        NULL,
        20,
        '수면 아래로 거대한 그림자가 천천히 지나간다. 오래 바라보았지만 다시 나타나지 않았다.',
        '/event/whale_shadow.png',
        NOW(),
        NOW()
    ),
    (
        2,
        '무지개',
        NULL,
        30,
        '비 그친 자리, 수평선 위로 옅은 무지개가 걸렸다.',
        '/event/rainbow.png',
        NOW(),
        NOW()
    ),
    (
        3,
        '돌고래 떼',
        NULL,
        15,
        '배 옆으로 돌고래 떼가 나타나 한참을 따라왔다.',
        '/event/dolphins.png',
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
        '/event/city_lights.png',
        NOW(),
        NOW()
    );