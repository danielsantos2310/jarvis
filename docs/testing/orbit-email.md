# Orbital waves and email speech

2026-10-07. Both production builds pass. Three focused browser scenarios verify device voice lifecycle, orbit motion/hidden-tab/reduced-motion/mobile controls, and explicit email speech with chunk continuation and cancellation on view change/close. The existing local Piper waveform scenario also passes. Desktop and 390px screenshots reviewed. UI audit: zero findings; design lint: zero errors, four existing token-reference warnings.

Speech uses synthetic browser fixtures; real Windows/iPhone voice availability and hardware playback require owner testing. Gmail OAuth/server adapter is unchanged; no real mailbox was connected or read in this workspace. Use the local app for real Gmail; Pages can speak only its fictional email sample.
