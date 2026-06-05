package org.example.drift_log.admin.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import org.example.drift_log.common.entity.BaseEntity;

@Getter
@Entity
@Table(name = "app_version")
public class AppVersion extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String version;


    // ======== 비즈니스 로직 ======== //
    // 1. 버전 교체
    public void updateVersion(String version) {
        this.version = version;
    }

    // 2. 버전 생성
    public static AppVersion create(String version) {
        AppVersion appVersion = new AppVersion();
        appVersion.version = version;
        return appVersion;
    }

}
