# Quiet classical piano collection

The app's `ClassicalPrelude.wav` now contains full score-based performances of:

1. John Field: Nocturne No. 5 in B-flat major, H.37 (1817), at a quiet quarter-note tempo of 78.
2. Friedrich Burgmüller: Consolation, Op.100 No.13, at quarter-note tempo 100.
3. Friedrich Burgmüller: Douce plainte, Op.100 No.16, at quarter-note tempo 90.

These replace all earlier Bach/Beethoven/Satie themes. The approximately 400-second recording uses an original synthesized soft-piano timbre, quiet dynamics, slight onset variation, short room echoes and unfolded written repeats. No modern recording or third-party soundfont is used. The slower tempos are performance choices and do not alter the written notes.

The pinned LilyPond editions come from MutopiaProject, commit `2144afd6f52d56c5b6995b8b589ef1268b3139f0`. Exact paths and SHA-256 hashes are in `PROVENANCE.json`; the source files retain their original credit headers.

- Field: typeset by **Alex Schreiber**, Mutopia-2016/10/06-2137, from Neue Musik-Zeitung (1889), **CC BY-SA 4.0**. Source: https://github.com/MutopiaProject/MutopiaProject/blob/2144afd6f52d56c5b6995b8b589ef1268b3139f0/ftp/FieldJ/H37/Field_Nocturne_5/Field_Nocturne_5.ly
- Burgmüller: typeset by **Bas Wassink**, Mutopia-2013/01/12-224 and Mutopia-2013/01/12-228, from Collection Litolff (19th century), explicitly dedicated to the **public domain** in the editions.

The combined rendered recording and performance adaptations are made available by NovaChess contributors under **Creative Commons Attribution-ShareAlike 4.0 International**. Preserve these credits, identify further changes and distribute adaptations under the same license. Full terms: `CC-BY-SA-4.0.txt`, https://creativecommons.org/licenses/by-sa/4.0/. This license applies to this music asset, independently of app source-code licensing.

To regenerate: install LilyPond 2.24.x, NumPy and mido, then run `python Scripts/generate-music.py` (or pass `--lilypond /path/to/lilypond`). Conversion runs on temporary copies; credited source editions are preserved unchanged. Xcode builds use the bundled WAV and need none of these tools.
