"""Opt-in reversible Unicode CE profile; never replaces legacy ceEncode."""

PROFILE = "ce-utf8-coordinate-v1"
MAX_BYTES = 65_536


def encode_unicode_ce(text):
    if not isinstance(text, str):
        raise ValueError("Unicode input must be text")
    if len(text) > MAX_BYTES:
        raise ValueError("Unicode input exceeds the byte limit")
    try:
        data = text.encode("utf-8", errors="strict")
    except UnicodeEncodeError as error:
        raise ValueError("Unpaired Unicode surrogate") from error
    if len(data) > MAX_BYTES:
        raise ValueError("Unicode input exceeds the byte limit")
    return {
        "profile": PROFILE,
        "frames": [{"wdm": byte & 127, "oam": byte >> 7, "pol": "H"} for byte in data],
    }


def decode_unicode_ce(payload):
    if not isinstance(payload, dict) or payload.get("profile") != PROFILE:
        raise ValueError("Unsupported or missing Unicode CE profile")
    frames = payload.get("frames")
    if not isinstance(frames, list) or len(frames) > MAX_BYTES:
        raise ValueError("Invalid or oversized Unicode frame sequence")
    data = bytearray()
    for frame in frames:
        if (not isinstance(frame, dict) or set(frame) != {"wdm", "oam", "pol"}
                or type(frame["wdm"]) is not int or not 0 <= frame["wdm"] <= 127
                or type(frame["oam"]) is not int or not 0 <= frame["oam"] <= 1
                or frame["pol"] != "H"):
            raise ValueError("Invalid Unicode coordinate")
        data.append(frame["wdm"] | (frame["oam"] << 7))
    try:
        return data.decode("utf-8", errors="strict")
    except UnicodeDecodeError as error:
        raise ValueError("Coordinate sequence is not valid UTF-8") from error
