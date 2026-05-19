-- =============================================
-- V1 : 도시 초기 데이터
-- 현재 로컬 static 경로 사용 중
-- S3 세팅 완료 후 URL 교체 필요
-- =============================================

INSERT INTO city (id, name, description, img_url, bgm_url, is_start_city, created_at, updated_at)
VALUES
    (
        1,
        '서울',
        '물에 잠긴 한강변. 절반쯤 가라앉은 아파트와 물 위로 드러난 지하철 표지판이 보인다. 한때 가장 번화했던 도시의 흔적이 수면 아래 조용히 남아 있다.',
        '/city/seoul.png',
        '/city/seoul_bgm.mp3',
        true,
        NOW(),
        NOW()
    ),
    (
        2,
        '인천',
        '수몰된 항구 도시. 컨테이너 크레인 꼭대기만 수면 위로 솟아 있다. 파도가 잔잔한 날이면 물 아래로 도시의 윤곽이 희미하게 보인다.',
        '/city/incheon.png',
        '/city/incheon_bgm.mp3',
        false,
        NOW(),
        NOW()
    ),
    (
        3,
        '대전',
        '내륙 깊숙이 물이 차올랐다. 고속도로 표지판과 육교만 수면 위에 남아 있고, 바람이 불면 도시였던 자리에서 이상한 소리가 들린다.',
        '/city/daejeon.png',
        '/city/daejeon_bgm.mp3',
        false,
        NOW(),
        NOW()
    ),
    (
        4,
        '강원도',
        '산자락까지 물이 차올랐지만 높은 봉우리는 살아남았다. 안개가 자욱한 날이면 섬처럼 보이는 산봉우리들이 수평선 위로 떠오른다.',
        '/city/gangwon.png',
        '/city/gangwon_bgm.mp3',
        false,
        NOW(),
        NOW()
    ),
    (
        5,
        '부산',
        '남쪽 끝 항구 도시. 수몰을 피한 사람들이 모여들었다는 소문이 있다. 멀리서 보면 불빛이 깜빡이는 것 같기도 하다.',
        '/city/busan.png',
        '/city/busan_bgm.mp3',
        false,
        NOW(),
        NOW()
    );