package com.mediqueue.util;

import java.io.ByteArrayOutputStream;
import java.util.Base64;

import org.springframework.stereotype.Component;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;

@Component
public class QrCodeGenerator {
    public String dataUrl(String value) {
        try {
            var matrix = new QRCodeWriter().encode(value, BarcodeFormat.QR_CODE, 320, 320);
            var output = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", output);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(output.toByteArray());
        } catch (Exception exception) {
            throw new IllegalStateException("Could not generate QR code", exception);
        }
    }
}
