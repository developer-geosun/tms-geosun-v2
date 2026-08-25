package com.geosun.tms.storage.repository;

import com.geosun.tms.storage.domain.StoredFile;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoredFileRepository extends JpaRepository<StoredFile, String> {

  List<StoredFile> findAllByOrderByCreatedAtDesc();

  List<StoredFile> findByStorageKeyStartingWithOrderByCreatedAtDesc(String prefix);
}
