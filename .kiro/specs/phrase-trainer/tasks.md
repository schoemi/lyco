# Implementation Plan: Phrasen-Trainer

## Overview

The Phrasen-Trainer is a new learning method that lets users record themselves singing along to selected stanzas of a song, then compare their recording against the instrumental and optional reference vocal track via a multi-channel mixer with volume and stereo panning controls. Implementation follows the state machine AUSWAHL → BEREIT → AUFNAHME → WIEDERGABE, building on existing vocal-trainer and karaoke infrastructure.

## Tasks

- [x] 1. Define types and utility functions
  - [x] 1.1 Create type definitions at `src/types/phrase-trainer.ts`
    - Define `PhrasenTrainerZustand`, `MixerZustand`, `AufnahmeDaten`, `Uebungsbereich` types as specified in the design
    - _Requirements: 11.1_

  - [x] 1.2 Implement utility functions at `src/lib/phrase-trainer/utils.ts`
    - Implement `hatTimecode(strophe)` — checks for markup with `typ === 'TIMECODE'`, `ziel === 'STROPHE'`, `timecodeMs != null`
    - Implement `findeInstrumental(audioQuellen)` — finds AudioQuelle with `rolle === 'INSTRUMENTAL'`
    - Implement `findeReferenzVokal(audioQuellen)` — finds AudioQuelle with `rolle === 'REFERENZ_VOKAL'`
    - Implement `berechnePanning(reglerWert)` — maps 0–1 to `{ aufnahme: -wert, referenz: +wert }`
    - _Requirements: 1.5, 5.1, 5.4, 7.2, 7.6_

  - [x] 1.3 Implement `berechneUebungsbereich` at `src/lib/phrase-trainer/uebungsbereich.ts`
    - Sort stanzas by `orderIndex`, find start timecode of first selected, end timecode of next stanza after last selected (or instrumental duration if last stanza)
    - Handle non-contiguous selections as a single continuous range
    - _Requirements: 4.2, 12.1, 12.2, 12.3_

  - [x] 1.4 Write property test for timecode selectability
    - **Property 2: Strophen ohne Timecode sind nicht auswählbar**
    - **Validates: Requirements 1.5**
    - Test file: `__tests__/phrase-trainer/timecode-selectable.property.test.ts`

  - [x] 1.5 Write property test for Übungsbereich calculation
    - **Property 3: Übungsbereich-Berechnung**
    - **Validates: Requirements 4.2, 12.1, 12.2, 12.3**
    - Test file: `__tests__/phrase-trainer/uebungsbereich-berechnung.property.test.ts`

  - [x] 1.6 Write property test for panning mapping
    - **Property 5: Panning-Mapping und Instrumental-Invariante**
    - **Validates: Requirements 7.2, 7.6**
    - Test file: `__tests__/phrase-trainer/panning-mapping.property.test.ts`

  - [x] 1.7 Write unit tests for utility functions
    - Test `hatTimecode`, `findeInstrumental`, `findeReferenzVokal`, `berechnePanning` with example-based tests
    - Test file: `__tests__/phrase-trainer/utils.test.ts`
    - _Requirements: 1.5, 5.1, 5.4, 7.2_

- [x] 2. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement StrophenAuswahl component
  - [x] 3.1 Create `src/components/phrase-trainer/strophen-auswahl.tsx`
    - Render all stanzas with checkboxes, disable stanzas without timecodes (show hint text)
    - Enable start button only when at least one stanza is selected
    - Preserve selection between practice rounds
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 3.2 Write property test for start button activation
    - **Property 1: Start-Button-Aktivierung korreliert mit Auswahl**
    - **Validates: Requirements 1.3, 1.4**
    - Test file: `__tests__/phrase-trainer/start-button-activation.property.test.ts`

  - [x] 3.3 Write unit tests for StrophenAuswahl
    - Test rendering of all stanzas, checkbox interaction, disabled state for stanzas without timecodes
    - Test file: `__tests__/phrase-trainer/strophen-auswahl.test.ts`
    - _Requirements: 1.1, 1.2, 1.5_

- [x] 4. Implement AufnahmeBereich component
  - [x] 4.1 Create `src/components/phrase-trainer/aufnahme-controls-pt.tsx`
    - Adapted recording controls for the Phrasen-Trainer (start, stop, cancel buttons)
    - Reuse patterns from existing `AufnahmeControls` but adapted for PhrasenTrainerZustand
    - _Requirements: 2.1, 2.5, 11.3_

  - [x] 4.2 Create `src/components/phrase-trainer/aufnahme-bereich.tsx`
    - Play instrumental from start timecode, record mic in mono 44.1 kHz (no echo cancellation, no noise suppression, no AGC)
    - Measure and compensate latency using existing `messeLatenz` and `kompensiere`
    - Auto-stop at end timecode
    - Show karaoke text display synced to timecode (reuse `TextAnzeige`)
    - Show VU meter (reuse `VuMeter`)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 10.1, 10.2_

  - [x] 4.3 Write unit tests for AufnahmeBereich
    - Test mic error handling (NotAllowedError, NotFoundError), auto-stop behavior
    - Test file: `__tests__/phrase-trainer/aufnahme-bereich.test.ts`
    - _Requirements: 2.2, 2.6, 2.7_

- [x] 5. Implement WiedergabeMixer component
  - [x] 5.1 Create `src/components/phrase-trainer/spur-regler.tsx`
    - Volume slider per track (0–100%), mute toggle, disabled state
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.2 Create `src/components/phrase-trainer/panning-regler.tsx`
    - Stereo separation slider (0–100%), visible only when reference vocal is active
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 5.3 Create `src/components/phrase-trainer/wiedergabe-controls.tsx`
    - Play/Pause and Stop buttons for mixer playback
    - _Requirements: 4.3_

  - [x] 5.4 Create `src/components/phrase-trainer/wiedergabe-mixer.tsx`
    - Three-channel playback using Web Audio API: Instrumental (HTMLAudioElement → MediaElementAudioSourceNode → GainNode), Recording (AudioBufferSourceNode → GainNode → StereoPannerNode), Reference Vocal (HTMLAudioElement → MediaElementAudioSourceNode → GainNode → StereoPannerNode)
    - Constrain playback to practice range (start/end timecodes), auto-stop at end
    - Reference vocal toggle: show/hide based on availability, reset panning when deactivated
    - Initial values: Instrumental 100%, Recording 100%, Reference 70%, Panning 50%
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.5 Write property test for reference toggle visibility
    - **Property 4: Referenz-Toggle-Sichtbarkeit**
    - **Validates: Requirements 5.1, 5.4**
    - Test file: `__tests__/phrase-trainer/referenz-toggle-sichtbarkeit.property.test.ts`

  - [x] 5.6 Write property test for volume mapping
    - **Property 6: Wiedergabe-Lautstärke-Mapping**
    - **Validates: Requirements 6.2**
    - Test file: `__tests__/phrase-trainer/lautstaerke-mapping.property.test.ts`

  - [x] 5.7 Write property test for mic gain mapping
    - **Property 7: Mikrofon-Gain-Mapping**
    - **Validates: Requirements 9.2**
    - Test file: `__tests__/phrase-trainer/mikrofon-gain-mapping.property.test.ts`

  - [x] 5.8 Write unit tests for WiedergabeMixer
    - Test initial volume values, panning reset on reference deactivation, playback range constraints
    - Test file: `__tests__/phrase-trainer/wiedergabe-mixer.test.ts`
    - _Requirements: 4.2, 5.3, 6.4, 7.5_

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement PhraseTrainerView main component
  - [x] 7.1 Create `src/components/phrase-trainer/geraete-auswahl.tsx`
    - Dropdown for microphone selection when >1 device available, auto-select first device
    - Disable device change during recording
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 7.2 Create `src/components/phrase-trainer/gain-regler.tsx`
    - Mic gain slider (0–300%), initial value 100%, real-time gain application
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 7.3 Create `src/components/phrase-trainer/phrase-trainer-view.tsx`
    - Implement state machine: AUSWAHL → BEREIT → AUFNAHME → WIEDERGABE
    - Integrate KopfhoererHinweis (reuse from vocal-trainer, session-based)
    - Coordinate StrophenAuswahl, AufnahmeBereich, WiedergabeMixer, GeraeteAuswahl, GainRegler
    - aria-live region for state change announcements
    - Handle missing instrumental (show hint), no stanzas with timecodes (start button permanently disabled)
    - Cleanup on unmount: stop MediaStreams, close AudioContext, clear intervals
    - _Requirements: 3.1, 3.2, 3.3, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 7.4 Write property test for aria-live state announcements
    - **Property 8: aria-live-Region spiegelt Zustand wider**
    - **Validates: Requirements 11.7**
    - Test file: `__tests__/phrase-trainer/aria-live-zustand.property.test.ts`

  - [x] 7.5 Write unit tests for PhraseTrainerView
    - Test state transitions, headphone dialog behavior, error states (no instrumental, no timecodes)
    - Test file: `__tests__/phrase-trainer/phrase-trainer-view.test.ts`
    - _Requirements: 3.1, 3.2, 3.3, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 8. Create Next.js page and wire everything together
  - [x] 8.1 Create the Phrasen-Trainer page route
    - Create the Next.js page component that loads song data and renders `PhraseTrainerView`
    - Reuse existing song data fetching patterns from the vocal-trainer page
    - Wire `onZurueck` navigation back to the song detail page
    - _Requirements: 1.1, 11.1_

  - [x] 8.2 Write integration tests for the full workflow
    - Test complete flow: stanza selection → recording → playback mixer
    - Test file: `__tests__/phrase-trainer/workflow-integration.test.ts`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Existing components reused: `KopfhoererHinweis`, `TextAnzeige`, `StrophenTitel`, `VuMeter`, `SongInfo`, `ZurueckButton`
- Existing utilities reused: `messeLatenz`, `kompensiere`, `flattenLines`
- German naming conventions are used for component and variable names to match the codebase
