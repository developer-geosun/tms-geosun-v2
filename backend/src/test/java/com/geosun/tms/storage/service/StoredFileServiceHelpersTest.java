package com.geosun.tms.storage.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.geosun.tms.auth.exception.ApiException;
import org.junit.jupiter.api.Test;

class StoredFileServiceHelpersTest {

  @Test
  void normalizeRelativeDir_acceptsSafePaths() {
    assertThat(StoredFileService.normalizeRelativeDir("admin-test")).isEqualTo("admin-test");
    assertThat(StoredFileService.normalizeRelativeDir("/vehicles/1/registration/"))
        .isEqualTo("vehicles/1/registration");
  }

  @Test
  void normalizeRelativeDir_rejectsTraversal() {
    assertThatThrownBy(() -> StoredFileService.normalizeRelativeDir("../etc"))
        .isInstanceOf(ApiException.class);
  }

  @Test
  void extensionOf_andSanitizeFilename() {
    assertThat(StoredFileService.extensionOf("photo.JPG")).isEqualTo(".jpg");
    assertThat(StoredFileService.extensionOf("noext")).isEmpty();
    assertThat(StoredFileService.sanitizeOriginalFilename("C:\\\\tmp\\\\a.pdf")).isEqualTo("a.pdf");
  }
}
