package ra.project.server.service;

import org.springframework.stereotype.Service;
import ra.project.server.model.dto.OrderDraft;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OrderDraftService {

    private final Map<String, OrderDraft> drafts = new ConcurrentHashMap<>();

    public OrderDraft saveDraft(OrderDraft draft) {
        cleanExpiredDrafts();
        drafts.put(draft.getDraftId(), draft);
        return draft;
    }

    public Optional<OrderDraft> getDraft(String draftId) {
        cleanExpiredDrafts();
        if (draftId == null) return Optional.empty();
        OrderDraft draft = drafts.get(draftId);
        if (draft == null || System.currentTimeMillis() > draft.getExpiresAt()) {
            drafts.remove(draftId);
            return Optional.empty();
        }
        return Optional.of(draft);
    }

    public void removeDraft(String draftId) {
        if (draftId != null) {
            drafts.remove(draftId);
        }
    }

    private void cleanExpiredDrafts() {
        long now = System.currentTimeMillis();
        drafts.entrySet().removeIf(entry -> entry.getValue().getExpiresAt() < now);
    }
}
