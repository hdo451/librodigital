from __future__ import annotations

import argparse
import asyncio
import html as html_lib
import json
import re
from pathlib import Path
from typing import List, Tuple

import edge_tts

ARABIC_CHARS = r"\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF٠-٩0-9،؛:()\-\/\s"


def strip_tags(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value)


def normalize_text(value: str) -> str:
    text = html_lib.unescape(value)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"\[[^\]]*\]", " ", text)
    text = re.sub(r"\([^)]*[A-Za-z][^)]*\)", " ", text)
    text = re.sub(r"[A-Za-z]", " ", text)
    text = re.sub(r"[\[\](){}<>]", " ", text)
    parts = re.findall(rf"[{ARABIC_CHARS}]+", text)
    text = " ".join(parts)
    text = re.sub(r"\(\s*\)", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def fnv1a_hex(value: str) -> str:
    hash_value = 2166136261
    for character in value:
        hash_value ^= ord(character)
        hash_value = (hash_value * 16777619) & 0xFFFFFFFF
    return f"{hash_value:08x}"


def extract_vocab_items(html_path: Path) -> List[str]:
    html = html_path.read_text(encoding="utf-8")
    blocks = re.findall(r"<(p|li)[^>]*>(.*?)</\1>", html, flags=re.S | re.I)
    plain = [normalize_text(strip_tags(fragment)) for _, fragment in blocks]

    first_quiz_index = next(
        (
            i
            for i, (_, fragment) in enumerate(blocks)
            if "اختبار سريع" in strip_tags(fragment) and "Quiz" in strip_tags(fragment)
        ),
        None,
    )

    vocab_candidates = [
        i
        for i, (_, fragment) in enumerate(blocks)
        if "المفردات" in strip_tags(fragment) and "Vocabulary" in strip_tags(fragment)
    ]
    vocab_index = next(
        (i for i in reversed(vocab_candidates) if first_quiz_index is None or i < first_quiz_index),
        None,
    )
    if vocab_index is None:
        raise SystemExit("No vocabulary heading found.")

    end_index = next(
        (
            i
            for i, (_, fragment) in enumerate(blocks[vocab_index + 1 :], start=vocab_index + 1)
            if "اختبار سريع" in strip_tags(fragment) and "Quiz" in strip_tags(fragment)
        ),
        len(blocks),
    )

    items: List[str] = []
    for text in plain[vocab_index + 1 : end_index]:
        if text:
            items.append(text)
    return items


async def synthesize_items(items: List[str], output_dir: Path, voice: str, overwrite: bool) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest: List[Tuple[str, str]] = []

    for text in items:
        filename = f"{fnv1a_hex(text)}.mp3"
        output_file = output_dir / filename
        manifest.append((filename, text))

        if output_file.exists() and output_file.stat().st_size > 0 and not overwrite:
            continue

        communicator = edge_tts.Communicate(text=text, voice=voice)
        await communicator.save(str(output_file))

    (output_dir / "manifest.json").write_text(
        json.dumps(
            [{"file": filename, "text": text} for filename, text in manifest],
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate Arabic audio for the vocabulary section.")
    parser.add_argument(
        "--source",
        default="content/8.Iraq__________Map_preview.html",
        help="HTML source file to scan.",
    )
    parser.add_argument(
        "--output",
        default="audio/vocab",
        help="Directory where MP3 files will be written.",
    )
    parser.add_argument(
        "--voice",
        default="ar-EG-SalmaNeural",
        help="Edge TTS voice name.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Regenerate existing audio files.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = Path(args.source)
    output = Path(args.output)

    items = extract_vocab_items(source)
    if not items:
        raise SystemExit("No vocabulary items found.")

    print(f"Found {len(items)} vocabulary items.")
    asyncio.run(synthesize_items(items, output, args.voice, args.overwrite))
    print(f"Wrote audio files to {output}")


if __name__ == "__main__":
    main()
