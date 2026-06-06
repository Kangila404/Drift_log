package org.example.drift_log.customerCenter.application;


import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.customerCenter.domain.model.Inquiry;
import org.example.drift_log.customerCenter.domain.repository.InquiryRepository;
import org.example.drift_log.customerCenter.exception.CustomerCenterErrorCode;
import org.example.drift_log.customerCenter.exception.CustomerCenterException;
import org.example.drift_log.customerCenter.presentation.dto.req.UpdateInquiryRequest;
import org.example.drift_log.customerCenter.presentation.dto.req.WriteInquiryRequest;
import org.example.drift_log.customerCenter.presentation.dto.res.InquiryResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.UpdateInquiryResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.WriteInquiryResponse;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.user.exception.UserErrorCode;
import org.example.drift_log.user.exception.UserException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class InquiryServiceImpl implements InquiryService{

    private final InquiryRepository inquiryRepository;
    private final UserRepository userRepository;

    @Override
    public List<InquiryResponse> findAllInquiries() {
        List<Inquiry> inquiries = inquiryRepository.findAll();

        // 작성자 id 모아서 한 번에 User 조회
        List<Long> authorIds = inquiries.stream()
            .map(Inquiry::getAuthorId)
            .distinct()
            .toList();

        Map<Long, String> nameMap = userRepository.findAllById(authorIds)
            .stream()
            .collect(Collectors.toMap(User::getId, User::getName));

        return inquiries.stream()
            .map(inquiry -> InquiryResponse.of(
                inquiry,
                nameMap.getOrDefault(inquiry.getAuthorId(), "(알 수 없음)")
            ))
            .toList();
    }

    @Override
    public WriteInquiryResponse writeInquiry(String userId, WriteInquiryRequest request) {

        User user = findUserByUserIdOrThrow(userId);

        Inquiry inquiry = Inquiry.builder()
            .title(request.title())
            .content(request.content())
            .authorId(user.getId())
            .build();

        inquiryRepository.save(inquiry);

        return new WriteInquiryResponse("success");
    }

    @Transactional(readOnly = true)
    @Override
    public List<InquiryResponse> getInquiries(String userId) {
        User user = findUserByUserIdOrThrow(userId);
        return inquiryRepository.findAllByAuthorId(user.getId())
            .stream()
            .map(inquiry -> InquiryResponse.of(inquiry, user.getName()))
            .toList();
    }

    @Override
    public UpdateInquiryResponse updateInquiry(String userId, Long inquiryId, UpdateInquiryRequest request) {
        User user = findUserByUserIdOrThrow(userId);
        Inquiry inquiry = findInquiryByIdOrThrow(inquiryId);
        validationInquiryOwned(inquiry, user.getId());

        inquiry.update(request.title(), request.content());

        inquiryRepository.save(inquiry);
        return new UpdateInquiryResponse("success");
    }

    @Override
    public void deleteInquiry(String userId, Long inquiryId) {
        User user = findUserByUserIdOrThrow(userId);
        Inquiry inquiry = findInquiryByIdOrThrow(inquiryId);
        validationInquiryOwned(inquiry, user.getId());

        inquiryRepository.deleteById(inquiry.getId());
    }


    // ============= 메서드 ============= //
    // 1. (String) userId -> User 조회
    private User findUserByUserIdOrThrow(String userId){
        return userRepository.findByUserId(userId)
            .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND_BY_ID)) ;
    }

    // 2. inquiryId -> Inquiry 조회
    private Inquiry findInquiryByIdOrThrow(Long inquiryId){
        return inquiryRepository.findById(inquiryId)
            .orElseThrow(()-> new CustomerCenterException(CustomerCenterErrorCode.INQUIRY_NOT_FOUND));
    }

    // 2. 검증 메서드
    private void validationInquiryOwned(Inquiry inquiry, Long userId){
        if (!inquiry.getAuthorId().equals(userId)) {
            throw new CustomerCenterException(CustomerCenterErrorCode.INVALID_INQUIRY_ACCESS);
        }
    }
}
