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
        '물에 잠긴 고궁. 한때 가장 번화했던 도시가 수면 아래 남아 있다.',
        '/city/seoul.png',
        '/city/seoul_bgm.mp3',
        true,
        NOW(),
        NOW()
    ),
    (
        2,
        '인천',
        '수몰된 인천 대교, 파도가 잔잔한 날이면 물 아래로 도시의 윤곽이 희미하게 보인다.',
        '/city/incheon.png',
        '/city/incheon_bgm.mp3',
        false,
        NOW(),
        NOW()
    ),
    (
        3,
        '대전',
        '내륙 깊숙이 물이 차올랐다. 바람이 불면 도시였던 자리에서 이상한 소리가 들린다.',
        '/city/daejeon.png',
        '/city/daejeon_bgm.mp3',
        false,
        NOW(),
        NOW()
    ),
    (
        4,
        '강릉',
        '산자락까지 물이 차올랐지만 높은 봉우리는 살아남았다. 안개가 자욱한 날이면 섬처럼 보이는 산봉우리들이 수평선 위로 떠오른다.',
        '/city/gangneung.png',
        '/city/gangneung_bgm.mp3',
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
    ),
    (
        6,
        '수원',
        '화성의 성벽이 수면 위로 드러나 있다. 성곽을 따라 물이 차오른 모습이 낯설다. 성 안쪽 깊은 곳에서 가끔 빛이 흔들린다.',
        '/city/suwon.png',
        '/city/suwon_bgm.mp3',
        false,
        NOW(),
        NOW()
    ),
    (
        7,
        '광주',
        '가장 낮은 고지의 있는 광주, 무등산 주상절리가 보인다.',
        '/city/gwangju.png',
        '/city/gwangju_bgm.mp3',
        false,
        NOW(),
        NOW()
    ),
    (
        8,
        '대구',
        '분지였던 지형 탓에 물이 깊게 고였다.',
        '/city/daegu.png',
        '/city/daegu_bgm.mp3',
        false,
        NOW(),
        NOW()
    ),
    (
        9,
        '포항',
        '가족과 함께 보았던 상생의 손이 보인다. 이젠 상생의 손마디인가.',
        '/city/pohang.png',
        '/city/pohang_bgm.mp3',
        false,
        NOW(),
        NOW()
    ),
    (
        10,
        '제주',
        '한라산 중턱까지 물이 찼다. 백록담이 섬이 되었다.',
        '/city/jeju.png',
        '/city/jeju_bgm.mp3',
        false,
        NOW(),
        NOW()
    );