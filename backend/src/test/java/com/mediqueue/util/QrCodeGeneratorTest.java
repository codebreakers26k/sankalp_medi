package com.mediqueue.util;

import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class QrCodeGeneratorTest {
    @Test
    void createsPngDataUrl() {
        String result = new QrCodeGenerator().dataUrl("queue-token-123");
        assertTrue(result.startsWith("data:image/png;base64,iVBOR"));
        assertTrue(result.length() > 500);
    }
}
