package org.example.drift_log;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class DriftLogApplicationTests {

    @Value("${DB_PORT:없음}")
    String dbPort;

    @Value("${DB_NAME:없음}")
    String dbName;

    @Test
    void contextLoads() {

    }

}
