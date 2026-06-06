# Libro digital interactivo

## Generar audio del vocabulario

```bash
cd /Users/hernancarvallo/Desktop/librodigital
python3 -m venv .venv
.venv/bin/python -m pip install edge-tts
.venv/bin/python generate_vocab_audio.py
```

El script lee `content/8.Iraq__________Map_preview.html` y crea `audio/vocab/*.mp3` desde `Vocabulary` hasta antes del primer `Quiz`.
Cada archivo se nombra con un hash del texto para que el botón de cada línea apunte siempre a su propio audio.
