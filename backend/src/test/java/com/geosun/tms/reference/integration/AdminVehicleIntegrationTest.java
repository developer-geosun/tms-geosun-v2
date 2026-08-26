package com.geosun.tms.reference.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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
import com.geosun.tms.reference.domain.VehicleType;
import com.geosun.tms.reference.dto.request.CreateVehicleRequest;
import com.geosun.tms.reference.dto.request.UpdateVehicleRequest;
import java.util.Objects;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(classes = TmsGeosunBackendJavaApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdminVehicleIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private UserRepository userRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @MockBean private JavaMailSender javaMailSender;

  @Test
  void user_forbiddenOnVehicles() throws Exception {
    User user = saveUser("user-veh@example.com", "Secret123", Role.USER);
    String token = login(Objects.requireNonNull(user.getEmail()), "Secret123");
    mockMvc
        .perform(
            get(ReferenceApiPaths.ADMIN_VEHICLES_BASE).header("Authorization", "Bearer " + token))
        .andExpect(status().isForbidden());
  }

  @Test
  void manager_crudSoftDeleteRestoreAndScans() throws Exception {
    User manager = saveUser("manager-veh@example.com", "Secret123", Role.MANAGER);
    String token = login(Objects.requireNonNull(manager.getEmail()), "Secret123");

    CreateVehicleRequest create =
        new CreateVehicleRequest(
            "AA1234BB",
            "WVWZZZ1JZYW000001",
            "Volvo",
            "FH16",
            (short) 2020,
            "ТОВ Тест",
            "АВС",
            "123456",
            VehicleType.SEMI_TRACTOR);

    MvcResult createdResult =
        mockMvc
            .perform(
                post(ReferenceApiPaths.ADMIN_VEHICLES_BASE)
                    .header("Authorization", "Bearer " + token)
                    .contentType(jsonContentType())
                    .content(toJson(create)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.plateNumber").value("AA1234BB"))
            .andExpect(jsonPath("$.vin").value("WVWZZZ1JZYW000001"))
            .andExpect(jsonPath("$.deleted").value(false))
            .andReturn();

    String id =
        objectMapper.readTree(createdResult.getResponse().getContentAsString()).get("id").asText();

    mockMvc
        .perform(
            post(ReferenceApiPaths.ADMIN_VEHICLES_BASE)
                .header("Authorization", "Bearer " + token)
                .contentType(jsonContentType())
                .content(toJson(create)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("PLATE_ALREADY_EXISTS"));

    MockMultipartFile front = new MockMultipartFile("file", "front.jpg", "image/jpeg", jpegBytes());
    mockMvc
        .perform(
            multipart(
                    ReferenceApiPaths.ADMIN_VEHICLES_BASE
                        + "/"
                        + id
                        + "/registration-certificate/front")
                .file(front)
                .with(
                    request -> {
                      request.setMethod("PUT");
                      return request;
                    })
                .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.originalFilename").value("front.jpg"));

    MvcResult download =
        mockMvc
            .perform(
                get(ReferenceApiPaths.ADMIN_VEHICLES_BASE
                        + "/"
                        + id
                        + "/registration-certificate/front")
                    .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();
    assertThat(download.getResponse().getContentAsByteArray()).isNotEmpty();

    mockMvc
        .perform(
            delete(ReferenceApiPaths.ADMIN_VEHICLES_BASE + "/" + id)
                .header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            get(ReferenceApiPaths.ADMIN_VEHICLES_BASE)
                .param("view", "active")
                .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$.length()").value(0));

    mockMvc
        .perform(
            post(ReferenceApiPaths.ADMIN_VEHICLES_BASE + "/" + id + "/restore")
                .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.deleted").value(false));

    UpdateVehicleRequest update =
        new UpdateVehicleRequest(
            "AA1234BB",
            "WVWZZZ1JZYW000001",
            "Volvo",
            "FH16",
            (short) 2021,
            "ТОВ Тест",
            "АВС",
            "123456",
            VehicleType.SEMI_TRACTOR);
    mockMvc
        .perform(
            put(ReferenceApiPaths.ADMIN_VEHICLES_BASE + "/" + id)
                .header("Authorization", "Bearer " + token)
                .contentType(jsonContentType())
                .content(toJson(update)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.manufactureYear").value(2021));
  }

  @NonNull
  private static MediaType jsonContentType() {
    return Objects.requireNonNull(MediaType.APPLICATION_JSON);
  }

  @NonNull
  private String toJson(@NonNull Object value) throws Exception {
    return Objects.requireNonNull(objectMapper.writeValueAsString(value));
  }

  private static byte[] jpegBytes() {
    // Мінімальний JPEG SOI/EOI достатній для content-type перевірки
    return new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xD9};
  }

  private User saveUser(String email, String password, Role role) {
    User u = new User();
    u.setEmail(email);
    u.setPasswordHash(passwordEncoder.encode(password));
    u.setRole(role);
    u.setEmailVerified(true);
    u.setActive(true);
    return userRepository.save(u);
  }

  private String login(@NonNull String email, @NonNull String password) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(jsonContentType())
                    .content(toJson(new LoginRequest(email, password))))
            .andExpect(status().isOk())
            .andReturn();
    JsonNode n = objectMapper.readTree(result.getResponse().getContentAsString());
    return n.get("accessToken").asText();
  }
}
