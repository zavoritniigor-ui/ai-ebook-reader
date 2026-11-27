"""Read the emitted font widths and PDF matrices independently of ReportLab."""
def text_boxes(page):
    boxes = []
    fonts = page["/Resources"]["/Font"]
    current = {"font": None, "size": 0, "scale": 1}
    stack = []

    def before(operator, operands, cm, tm):
        if operator == b"q":
            stack.append(current.copy())
        elif operator == b"Q" and stack:
            current.update(stack.pop())
        elif operator == b"Tf":
            current.update(font=fonts[operands[0]].get_object(), size=float(operands[1]))
        elif operator == b"Tz":
            current["scale"] = float(operands[0]) / 100
        elif operator == b"Tj":
            font = current["font"]
            value = operands[0]
            raw = value.original_bytes if hasattr(value, "original_bytes") else bytes(value)
            raw = raw.rstrip(b" ")
            widths, first = font["/Widths"], int(font["/FirstChar"])
            width = sum(float(widths[code - first]) for code in raw) / 1000 * current["size"] * current["scale"]
            descriptor = font["/FontDescriptor"]
            ascent, descent = float(descriptor["/Ascent"]) / 1000, float(descriptor["/Descent"]) / 1000
            def point(x, y):
                x, y = x * tm[0] + y * tm[2] + tm[4], x * tm[1] + y * tm[3] + tm[5]
                return (x * cm[0] + y * cm[2] + cm[4], x * cm[1] + y * cm[3] + cm[5])
            left, top = point(0, ascent * current["size"])
            right, bottom = point(width, descent * current["size"])
            height = float(page.mediabox.height)
            boxes.append((left, height - top, right, height - bottom))
    page.extract_text(visitor_operand_before=before)
    return boxes
