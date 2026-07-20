asset_family: presentation-audio-v1
owner: midnight-variety-presentation
source: deterministic-generator
generator: scripts/generate-presentation-audio.mjs
fixed_seed: midnight-variety-audio-v1
sample_format: mono 16-bit PCM WAV at 32000 Hz
review_state: approved

composition:
One original 96-second loop is split into three sample-aligned stems. The
atmosphere stem uses continuous periodic indigo drones and sparse gong breath;
the percussion stem uses bounded board-drum, wood and small-gong events; the
color stem uses an original pentatonic plucked-string phrase with restrained
flute-like sustain. All three stems contain exactly 3072000 samples and share
the same loop boundary.

one_shots:
Twenty-two core effects synthesize paper, card, wood, coin, seal, curtain,
pack, market, score and unlock gestures. Four longer stingers cover victory,
loss, rare acquisition and achievement completion. No external recordings,
samples, songs, model outputs or third-party audio assets are used.

generator_input:
Fixed asset IDs, durations, target peaks, oscillator partials, envelopes,
filters, event schedule and project PRNG seed are committed in the generator.
`node scripts/generate-presentation-audio.mjs --check` regenerates every byte
and rejects drift or unexpected WAV files.

review_checklist:
File counts, PCM headers, exact durations, synchronized stem sample counts,
non-silence, conservative peaks, seamless loop boundary, distinct gesture
families, aggregate budgets and local-only ownership were reviewed. Gameplay
remains fully usable when media is blocked or unavailable.
