package ra.project.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import ra.project.server.exception.GlobalExceptionHandler;
import ra.project.server.model.dto.request.StoreLocationRequest;
import ra.project.server.model.entity.StoreLocation;
import ra.project.server.repository.StoreLocationRepository;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class StoreLocationControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private StoreLocationRepository storeLocationRepository;

    @InjectMocks
    private StoreLocationController storeLocationController;

    private StoreLocation sampleStore;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders
                .standaloneSetup(storeLocationController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        sampleStore = StoreLocation.builder()
                .id(1L)
                .name("NEXOR Showroom Cầu Giấy")
                .address("Số 123 Đường Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội")
                .province("Hà Nội")
                .district("Quận Cầu Giấy")
                .phoneNumber("024 3767 8888")
                .latitude(21.034870)
                .longitude(105.795230)
                .openHours("08:00 - 22:00")
                .status("ACTIVE")
                .build();
    }

    @Test
    void whenGetPublicStores_withoutProvince_thenReturnAllActiveStores() throws Exception {
        when(storeLocationRepository.count()).thenReturn(6L);
        when(storeLocationRepository.findByStatusIgnoreCase("ACTIVE"))
                .thenReturn(List.of(sampleStore));

        mockMvc.perform(get("/api/stores"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].name").value("NEXOR Showroom Cầu Giấy"))
                .andExpect(jsonPath("$.data[0].province").value("Hà Nội"));

        verify(storeLocationRepository).findByStatusIgnoreCase("ACTIVE");
    }

    @Test
    void whenGetPublicStores_withProvince_thenReturnFilteredStores() throws Exception {
        when(storeLocationRepository.count()).thenReturn(6L);
        when(storeLocationRepository.findByProvinceContainingIgnoreCaseAndStatusIgnoreCase("Hà Nội", "ACTIVE"))
                .thenReturn(List.of(sampleStore));

        mockMvc.perform(get("/api/stores").param("province", "Hà Nội"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].province").value("Hà Nội"));

        verify(storeLocationRepository).findByProvinceContainingIgnoreCaseAndStatusIgnoreCase("Hà Nội", "ACTIVE");
    }

    @Test
    void whenGetPublicStoreById_withValidId_thenReturnStore() throws Exception {
        when(storeLocationRepository.count()).thenReturn(6L);
        when(storeLocationRepository.findById(1L)).thenReturn(Optional.of(sampleStore));

        mockMvc.perform(get("/api/stores/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("NEXOR Showroom Cầu Giấy"));
    }

    @Test
    void whenGetPublicStoreById_withInvalidId_thenReturn404() throws Exception {
        when(storeLocationRepository.count()).thenReturn(6L);
        when(storeLocationRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/stores/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void whenCreateStore_withValidRequest_thenReturn201() throws Exception {
        StoreLocationRequest request = StoreLocationRequest.builder()
                .name("NEXOR Showroom Tân Bình")
                .address("Số 456 Đường Cộng Hòa, Phường 13, Quận Tân Bình, TP.HCM")
                .province("TP. Hồ Chí Minh")
                .district("Quận Tân Bình")
                .phoneNumber("028 3812 3456")
                .latitude(10.801234)
                .longitude(106.654321)
                .openHours("08:00 - 22:00")
                .status("ACTIVE")
                .build();

        StoreLocation saved = StoreLocation.builder()
                .id(7L)
                .name(request.getName())
                .address(request.getAddress())
                .province(request.getProvince())
                .district(request.getDistrict())
                .phoneNumber(request.getPhoneNumber())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .openHours(request.getOpenHours())
                .status("ACTIVE")
                .build();

        when(storeLocationRepository.save(any(StoreLocation.class))).thenReturn(saved);

        mockMvc.perform(post("/api/admin/stores")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(7))
                .andExpect(jsonPath("$.data.name").value("NEXOR Showroom Tân Bình"));

        verify(storeLocationRepository).save(any(StoreLocation.class));
    }

    @Test
    void whenUpdateStore_withValidId_thenReturn200() throws Exception {
        StoreLocationRequest request = StoreLocationRequest.builder()
                .name("NEXOR Showroom Cầu Giấy (Mới)")
                .address("Số 125 Đường Cầu Giấy, Hà Nội")
                .province("Hà Nội")
                .district("Quận Cầu Giấy")
                .phoneNumber("024 3767 9999")
                .latitude(21.034870)
                .longitude(105.795230)
                .openHours("08:00 - 22:30")
                .status("ACTIVE")
                .build();

        when(storeLocationRepository.findById(1L)).thenReturn(Optional.of(sampleStore));
        when(storeLocationRepository.save(any(StoreLocation.class))).thenAnswer(i -> i.getArgument(0));

        mockMvc.perform(put("/api/admin/stores/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("NEXOR Showroom Cầu Giấy (Mới)"));
    }

    @Test
    void whenDeleteStore_withValidId_thenReturn200() throws Exception {
        when(storeLocationRepository.existsById(1L)).thenReturn(true);
        doNothing().when(storeLocationRepository).deleteById(1L);

        mockMvc.perform(delete("/api/admin/stores/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(storeLocationRepository).deleteById(1L);
    }
}

