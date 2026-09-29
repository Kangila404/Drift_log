package org.example.drift_log.user.application;

import java.util.List;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.user.domain.enums.AuthType;
import org.example.drift_log.user.domain.model.AuthIdentity;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.AuthIdentityRepository;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.user.exception.UserErrorCode;
import org.example.drift_log.user.exception.UserException;
import org.example.drift_log.user.infrastructure.oauth.AppleAccountRevoker;
import org.example.drift_log.user.presentation.dto.req.DeleteAccountRequest;
import org.example.drift_log.user.presentation.dto.req.UpdateNameRequest;
import org.example.drift_log.user.presentation.dto.req.UpdatePasswordRequest;
import org.example.drift_log.user.presentation.dto.res.UserMeResponse;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.example.drift_log.customerCenter.domain.enums.InquiryStatus;
import org.example.drift_log.voyage.domain.repository.VoyageLogRepository;
import org.example.drift_log.voyage.domain.repository.VoyageStatusRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@RequiredArgsConstructor
@Service
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final AuthIdentityRepository authIdentityRepository;
    private final PasswordEncoder passwordEncoder;
    private final VoyageLogRepository voyageLogRepository;
    private final VoyageStatusRepository voyageStatusRepository;
    private final EntityManager entityManager;
    private final AppleAccountRevoker appleAccountRevoker;

    @Override
    @Transactional(readOnly = true)
    public UserMeResponse getMe(String userId) {
        User user = findUserByUserIdOrThrow(userId);

        // 인증수단 조회 (email, 가입방식)
        AuthIdentity identity = authIdentityRepository
            .findFirstByUserId(user.getId())
            .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        List<Long> visitedCityIds = voyageLogRepository.findDistinctToCityIdsByUserId(user.getId());
        long totalVoyages = voyageLogRepository.countByUserId(user.getId());
        long visitedCities = visitedCityIds.size();

        boolean isFamilyReunited = voyageStatusRepository.findByUserId(user.getId())
            .map(VoyageStatus::isFamilyReunited)
            .orElse(false);

        return UserMeResponse.of(
            user,
            identity.getEmail(),
            identity.getProvider().name(),
            totalVoyages, visitedCities, visitedCityIds, isFamilyReunited
        );
    }

    @Override
    public void updateName(String userId, UpdateNameRequest request) {
        User user = findUserByUserIdOrThrow(userId);
        user.updateName(request.name());
        userRepository.save(user);
    }

    @Override
    public void updatePassword(String userId, UpdatePasswordRequest request) {
        User user = findUserByUserIdOrThrow(userId);

        AuthIdentity identity = authIdentityRepository
            .findByUserIdAndProvider(user.getId(), AuthType.LOCAL)
            .orElseThrow(() -> new UserException(UserErrorCode.INVALID_AUTHTYPE));

        if (!passwordEncoder.matches(request.currentPassword(), identity.getPassword())) {
            throw new UserException(UserErrorCode.INVALID_PASSWORD);
        }

        if (!request.newPassword().equals(request.newPasswordConfirm())) {
            throw new UserException(UserErrorCode.PASSWORD_NOT_MATCHED);
        }

        identity.updatePassword(passwordEncoder.encode(request.newPassword()));
        authIdentityRepository.save(identity);
    }

    @Override
    public void deleteAccount(String userId, DeleteAccountRequest request) {
        User user = findUserByUserIdOrThrow(userId);
        Long id = user.getId();

        // Revoke only the Apple identity belonging to this authenticated user.
        // Fail before any deletion if verification or Apple's service fails.
        authIdentityRepository.findByUserIdAndProvider(id, AuthType.APPLE)
            .ifPresent(identity -> appleAccountRevoker.revoke(identity.getProviderId(), request));

        // Delete dependent records before the user row. This is intentionally a
        // permanent deletion, not account deactivation, so a deleted account
        // cannot authenticate or retain gameplay/personal records.
        execute("delete from RefreshToken token where token.userId = :userId", id);
        execute("delete from StudyTime study where study.user.id = :userId", id);
        execute("delete from EndingFeedback feedback where feedback.user.id = :userId", id);
        execute("delete from AuthIdentity identity where identity.user.id = :userId", id);
        execute("delete from CustomBoat boat where boat.userId = :userId", id);
        execute("delete from VoyageStatus status where status.userId = :userId", id);
        execute("delete from DiscoveredTrace trace where trace.userId = :userId", id);
        execute("delete from VoyageEvent event where event.voyageLog.userId = :userId", id);
        execute("delete from VoyageLog log where log.userId = :userId", id);

        // Customer-support entries are user content as well. Replies written by
        // the departing account are removed and their inquiries reopened first.
        entityManager.createQuery("update Inquiry inquiry set inquiry.inquiryStatus = :open "
                + "where inquiry.id in (select answer.inquiry.id from InquiryAnswer answer where answer.answererId = :userId)")
            .setParameter("open", InquiryStatus.OPEN)
            .setParameter("userId", id)
            .executeUpdate();
        execute("delete from InquiryAnswer answer where answer.answererId = :userId", id);
        execute("delete from InquiryAnswer answer where answer.inquiry.authorId = :userId", id);
        execute("delete from Inquiry inquiry where inquiry.authorId = :userId", id);
        execute("delete from Notice notice where notice.authorId = :userId", id);

        // Bulk deletes bypass the persistence context. A loaded Apple identity
        // would otherwise still reference a removed User at transaction flush.
        execute("delete from User user where user.id = :userId", id);
        entityManager.clear();
    }

    private void execute(String jpql, Long userId) {
        entityManager.createQuery(jpql)
            .setParameter("userId", userId)
            .executeUpdate();
    }

    // =========== 메서드 ========== //
    private User findUserByUserIdOrThrow(String userId){
        return userRepository.findByUserId(userId)
            .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));
    }
}
