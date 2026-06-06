package org.example.drift_log.customerCenter.exception;

import lombok.Getter;
import org.example.drift_log.common.exception.DriftLogException;

@Getter
public class CustomerCenterException extends DriftLogException {

    private final CustomerCenterErrorCode errorCode;

    public CustomerCenterException(CustomerCenterErrorCode errorCode){
        super(errorCode.getStatus(), errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
