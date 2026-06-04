package org.example.drift_log;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DriftLogApplication {

    public static void main(String[] args) {
        SpringApplication.run(DriftLogApplication.class, args);
    }

}
