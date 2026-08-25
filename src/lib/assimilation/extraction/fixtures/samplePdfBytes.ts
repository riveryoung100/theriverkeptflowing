export function createSamplePdfBytes(
    text:
        string = "River PDF Test"
): Uint8Array {

    const escapedText =
        text
            .replace(
                /\\/g,
                "\\\\"
            )
            .replace(
                /\(/g,
                "\\("
            )
            .replace(
                /\)/g,
                "\\)"
            );

    const stream =
        `BT /F1 18 Tf 40 90 Td (${escapedText}) Tj ET`;

    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    ];

    let pdf =
        "%PDF-1.4\n";

    const offsets:
        number[] = [
            0
        ];

    for (
        let index = 0;
        index < objects.length;
        index++
    ) {

        offsets.push(
            pdf.length
        );

        pdf +=
            `${index + 1} 0 obj\n` +
            `${objects[index]}\n` +
            "endobj\n";

    }

    const xrefOffset =
        pdf.length;

    pdf +=
        "xref\n" +
        `0 ${objects.length + 1}\n` +
        "0000000000 65535 f \n";

    for (
        let index = 1;
        index < offsets.length;
        index++
    ) {

        pdf +=
            `${String(
                offsets[index]
            ).padStart(
                10,
                "0"
            )} 00000 n \n`;

    }

    pdf +=
        "trailer\n" +
        `<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
        "startxref\n" +
        `${xrefOffset}\n` +
        "%%EOF\n";

    return new TextEncoder()
        .encode(
            pdf
        );

}
