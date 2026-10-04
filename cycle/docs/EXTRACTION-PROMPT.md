# Signal extraction prompt (production)

*Used with Claude on each intake item: an email, a meeting note, a chat or a transcript. It fills the
same schema the deterministic demo extractor fills, and everything downstream (grading checks,
corroboration, gating, overlays) is unchanged. Run it inside the walls on real material. Only the
JSON leaves, and it is code-named first.*

---

You read one piece of workplace text and return the **signals** in it: claims that should change a
contact-center forecast or explain a past day. Return JSON only, as an array (empty if none).

```json
[{
  "kind": "forward | explanation",
  "type": "client | migration | calendar | platform | weather | absence | other",
  "gates": ["G115"], "segments": ["A-S08"], "products": ["D"],
  "channels": ["voice", "chat", "email"],
  "start": "yyyy-mm-dd", "end": "yyyy-mm-dd or null",
  "direction": "up | down | null", "pct": 15,
  "grade": "V | E | I | U",
  "quote": "the exact words the claim rests on",
  "speaker_role": "who said it, as a role"
}]
```

## Rules

1. **Kinds.** A **forward** signal changes the future: a client onboarding, a migration wave, a holiday, a platform change. An **explanation** accounts for a past day: illness, a storm, an outage.
2. **Dates.** Resolve relative dates against the message date. "Monday through Wednesday" in a Thursday note means the three days just past. Never invent a date. If there is none, there is no signal.
3. **Size.** Give a size only if one is stated. Never estimate it.
4. **Grades.**
   - **V:** from a plan, calendar or system of record.
   - **E:** a named owner giving specifics (a number and a date).
   - **I:** hedged ("maybe", "might", "not confirmed").
   - **U:** hearsay ("I heard", "apparently", forwarded with no source).
   - When unsure, grade down.
5. **What is not a signal.** Chatter, thanks, facilities notes and opinions are not signals.
6. **Quoting.** Quote exactly. The quote is how a reviewer checks you.
