package com.geosun.tms.auth.repository;

import com.geosun.tms.auth.domain.user.Role;
import com.geosun.tms.auth.domain.user.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository
    extends JpaRepository<User, String>, JpaSpecificationExecutor<User> {

  Optional<User> findByEmailAndDeletedFalse(String email);

  /**
   * Для login: спочатку активний запис з email, інакше видалений (щоб повернути 403 USER_DELETED).
   */
  Optional<User> findTopByEmailOrderByDeletedAsc(String email);

  boolean existsByEmailAndDeletedFalse(String email);

  @Query(
      """
      select count(u) from User u
      where u.role = :role and u.active = true and u.deleted = false
      """)
  long countActiveByRole(@Param("role") Role role);
}
