package ra.project.server.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.util.StringUtils;

public class PaginationUtil {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 10;
    private static final int MAX_SIZE = 100;

    public static Pageable createPageable(Integer page, Integer size, String sort) {
        int pageNumber = (page != null && page >= 0) ? page : DEFAULT_PAGE;
        int pageSize = (size != null && size > 0) ? Math.min(size, MAX_SIZE) : DEFAULT_SIZE;

        Sort sortObj = parseSort(sort);
        return PageRequest.of(pageNumber, pageSize, sortObj);
    }

    private static Sort parseSort(String sort) {
        if (!StringUtils.hasText(sort)) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }

        // Support formats: "price,asc", "price,desc", "price_asc", "price_desc"
        String trimmed = sort.trim();
        if (trimmed.contains(",")) {
            String[] parts = trimmed.split(",");
            String property = parts[0].trim();
            Sort.Direction direction = (parts.length > 1 && parts[1].trim().equalsIgnoreCase("asc"))
                    ? Sort.Direction.ASC
                    : Sort.Direction.DESC;
            return Sort.by(direction, property);
        } else if (trimmed.contains("_")) {
            String[] parts = trimmed.split("_");
            String property = parts[0].trim();
            Sort.Direction direction = (parts.length > 1 && parts[1].trim().equalsIgnoreCase("asc"))
                    ? Sort.Direction.ASC
                    : Sort.Direction.DESC;
            return Sort.by(direction, property);
        } else {
            return Sort.by(Sort.Direction.ASC, trimmed);
        }
    }
}
