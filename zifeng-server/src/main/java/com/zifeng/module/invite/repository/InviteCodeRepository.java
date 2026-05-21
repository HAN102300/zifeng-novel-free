package com.zifeng.module.invite.repository;

import com.zifeng.module.invite.entity.InviteCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InviteCodeRepository extends JpaRepository<InviteCode, Long> {

    Optional<InviteCode> findByCode(String code);

    List<InviteCode> findByCreatedByOrderByCreatedAtDesc(Long createdBy);

    List<InviteCode> findByStatusOrderByCreatedAtDesc(Integer status);

    long countByStatus(Integer status);
}
