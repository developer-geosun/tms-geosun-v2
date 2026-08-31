package com.geosun.tms.reference.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.geosun.tms.auth.TmsGeosunBackendJavaApplication;
import com.geosun.tms.auth.domain.user.Role;
import com.geosun.tms.auth.domain.user.User;
import com.geosun.tms.auth.dto.request.LoginRequest;
import com.geosun.tms.auth.repository.UserRepository;
import com.geosun.tms.reference.api.ReferenceApiPaths;
import com.geosun.tms.reference.domain.CountryReference;
import com.geosun.tms.reference.dto.request.CreateDocumentTypeRequest;
import com.geosun.tms.reference.dto.request.DocumentTypeFieldDefinitionRequest;
import com.geosun.tms.reference.dto.request.UpdateDocumentTypeRequest;
import com.geosun.tms.reference.repository.CountryReferenceRepository;
import java.util.List;
import java.util.Objects;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(classes = TmsGeosunBackendJavaApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdminDocumentTypeIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private UserRepository userRepository;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private CountryReferenceRepository countryReferenceRepository;

  @MockBean private JavaMailSender javaMailSender;

  @BeforeEach
  void seedCountries() {
    countryReferenceRepository.deleteAll();
    saveCountry("UA", "UKR", "Україна", "Ukraine", "Украина");
    saveCountry("PL", "POL", "Польща", "Poland", "Польша");
  }

  private void saveCountry(
      String alpha2, String alpha3, String nameUk, String nameEn, String nameRu) {
    CountryReference country = new CountryReference();
    country.setCodeAlpha2(alpha2);
    country.setCodeAlpha3(alpha3);
    country.setNameUk(nameUk);
    country.setNameEn(nameEn);
    country.setNameRu(nameRu);
    countryReferenceRepository.save(country);
  }

  @Test
  void user_forbiddenOnDocumentTypes() throws Exception {
    User user = saveUser("user-doctype@example.com", "Secret123", Role.USER);
    String token = login(Objects.requireNonNull(user.getEmail()), "Secret123");
    mockMvc
        .perform(
            get(ReferenceApiPaths.ADMIN_DOCUMENT_TYPES_BASE)
                .header("Authorization", "Bearer " + token))
        .andExpect(status().isForbidden());
  }

  @Test
  void manager_forbiddenOnDocumentTypes() throws Exception {
    User manager = saveUser("manager-doctype@example.com", "Secret123", Role.MANAGER);
    String token = login(Objects.requireNonNull(manager.getEmail()), "Secret123");
    mockMvc
        .perform(
            get(ReferenceApiPaths.ADMIN_DOCUMENT_TYPES_BASE)
                .header("Authorization", "Bearer " + token))
        .andExpect(status().isForbidden());
  }

  @Test
  void admin_documentTypeCrudRestoreAndValidation() throws Exception {
    User admin = saveUser("admin-doctype@example.com", "Secret123", Role.ADMIN);
    String token = login(Objects.requireNonNull(admin.getEmail()), "Secret123");

    CreateDocumentTypeRequest create =
        new CreateDocumentTypeRequest(
            "Паспорт",
            "Passport",
            "Паспорт",
            "UA",
            2,
            List.of(
                new DocumentTypeFieldDefinitionRequest(
                    "lastName", "Прізвище", "Last name", "Фамилия")));

    MvcResult created =
        mockMvc
            .perform(
                post(ReferenceApiPaths.ADMIN_DOCUMENT_TYPES_BASE)
                    .header("Authorization", "Bearer " + token)
                    .contentType(json())
                    .content(Objects.requireNonNull(toJson(create))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.nameUk").value("Паспорт"))
            .andExpect(jsonPath("$.countryCode").value("UA"))
            .andExpect(jsonPath("$.plannedScanPages").value(2))
            .andExpect(jsonPath("$.fieldDefinitions.length()").value(1))
            .andExpect(jsonPath("$.fieldDefinitions[0].key").value("lastName"))
            .andReturn();
    String id =
        objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    mockMvc
        .perform(
            post(ReferenceApiPaths.ADMIN_DOCUMENT_TYPES_BASE)
                .header("Authorization", "Bearer " + token)
                .contentType(json())
                .content(Objects.requireNonNull(toJson(create))))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("DOCUMENT_TYPE_NAME_EXISTS"));

    mockMvc
        .perform(
            get(ReferenceApiPaths.ADMIN_DOCUMENT_TYPES_BASE)
                .param("view", "active")
                .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1));

    UpdateDocumentTypeRequest update =
        new UpdateDocumentTypeRequest(
            "Паспорт громадянина",
            "Citizen passport",
            "Паспорт гражданина",
            "UA",
            0,
            List.of(
                new DocumentTypeFieldDefinitionRequest(
                    "lastName", "Прізвище", "Last name", "Фамилия"),
                new DocumentTypeFieldDefinitionRequest("firstName", "Ім'я", "First name", "Имя")));

    mockMvc
        .perform(
            put(ReferenceApiPaths.ADMIN_DOCUMENT_TYPES_BASE + "/" + id)
                .header("Authorization", "Bearer " + token)
                .contentType(json())
                .content(Objects.requireNonNull(toJson(update))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nameUk").value("Паспорт громадянина"))
        .andExpect(jsonPath("$.plannedScanPages").value(0))
        .andExpect(jsonPath("$.fieldDefinitions.length()").value(2));

    mockMvc
        .perform(
            delete(ReferenceApiPaths.ADMIN_DOCUMENT_TYPES_BASE + "/" + id)
                .header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            get(ReferenceApiPaths.ADMIN_DOCUMENT_TYPES_BASE)
                .param("view", "active")
                .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));

    mockMvc
        .perform(
            get(ReferenceApiPaths.ADMIN_DOCUMENT_TYPES_BASE)
                .param("view", "deleted")
                .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1));

    mockMvc
        .perform(
            post(ReferenceApiPaths.ADMIN_DOCUMENT_TYPES_BASE + "/" + id + "/restore")
                .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.deleted").value(false));

    CreateDocumentTypeRequest invalidCountry =
        new CreateDocumentTypeRequest("Test", "Test", "Test", "ZZ", 1, List.of());

    mockMvc
        .perform(
            post(ReferenceApiPaths.ADMIN_DOCUMENT_TYPES_BASE)
                .header("Authorization", "Bearer " + token)
                .contentType(json())
                .content(Objects.requireNonNull(toJson(invalidCountry))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("COUNTRY_NOT_FOUND"));

    CreateDocumentTypeRequest invalidFieldKey =
        new CreateDocumentTypeRequest(
            "Інший",
            "Other",
            "Другой",
            "UA",
            1,
            List.of(new DocumentTypeFieldDefinitionRequest("1bad", "A", "B", "C")));

    mockMvc
        .perform(
            post(ReferenceApiPaths.ADMIN_DOCUMENT_TYPES_BASE)
                .header("Authorization", "Bearer " + token)
                .contentType(json())
                .content(Objects.requireNonNull(toJson(invalidFieldKey))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  private User saveUser(String email, String password, Role role) {
    User user = new User();
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(password));
    user.setRole(role);
    user.setActive(true);
    user.setEmailVerified(true);
    return userRepository.save(user);
  }

  private String login(String email, String password) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(json())
                    .content(Objects.requireNonNull(toJson(new LoginRequest(email, password)))))
            .andExpect(status().isOk())
            .andReturn();
    JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
    return body.get("accessToken").asText();
  }

  @NonNull
  private MediaType json() {
    return Objects.requireNonNull(MediaType.APPLICATION_JSON);
  }

  private String toJson(Object value) throws Exception {
    return objectMapper.writeValueAsString(value);
  }
}
