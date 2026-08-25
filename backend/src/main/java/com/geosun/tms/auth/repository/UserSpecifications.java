package com.geosun.tms.auth.repository;

import com.geosun.tms.auth.domain.user.Role;
import com.geosun.tms.auth.domain.user.User;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

/** Фільтри списку користувачів для ADMIN. */
public final class UserSpecifications {

  private UserSpecifications() {}

  public static Specification<User> adminFilter(
      String email, Role role, Boolean active, Boolean deleted) {
    return Specification.where(emailContains(email))
        .and(hasRole(role))
        .and(hasActive(active))
        .and(hasDeleted(deleted));
  }

  private static Specification<User> emailContains(String email) {
    return (root, query, cb) -> {
      if (!StringUtils.hasText(email)) {
        return cb.conjunction();
      }
      return cb.like(cb.lower(root.get("email")), "%" + email.trim().toLowerCase() + "%");
    };
  }

  private static Specification<User> hasRole(Role role) {
    return (root, query, cb) -> role == null ? cb.conjunction() : cb.equal(root.get("role"), role);
  }

  private static Specification<User> hasActive(Boolean active) {
    return (root, query, cb) ->
        active == null ? cb.conjunction() : cb.equal(root.get("active"), active);
  }

  private static Specification<User> hasDeleted(Boolean deleted) {
    return (root, query, cb) ->
        deleted == null ? cb.conjunction() : cb.equal(root.get("deleted"), deleted);
  }
}
