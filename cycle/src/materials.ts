/**
 * materials.ts — synthetic unstructured material for the demo intake, with labels kept apart.
 * Emails, meeting notes, chats and a stand-up transcript, written the way people write: hedges,
 * relative dates, chatter. Some carry real forward signals, some explain past days the cycle
 * flagged, one is the planted rumor, and some carry nothing at all. The labels (what a correct
 * extraction must find) are for scoring only; the intake never reads them.
 */
import { PLANT } from "./registry";

export interface Item { id: string; received: string; source_kind: "email" | "meeting-notes" | "chat" | "transcript" | "ops-note"; author_role: string; subject: string; text: string }
export interface Label { item: string; kind: "forward" | "explanation" | "none"; type?: string; gates?: string[]; start?: string; end?: string; direction?: "up" | "down"; pct?: number; grade?: "V" | "E" | "I" | "U"; true_claim?: boolean; should_apply?: boolean }

export function materials(): { items: Item[]; labels: Label[] } {
  const items: Item[] = [
    { id: "IT-001", received: "2026-09-30", source_kind: "email", author_role: "migration program lead", subject: "Wave 3 confirmed",
      text: "All — confirming the final wave for the legacy book is locked for February 1. That takes us to 90% moved onto the online product. No change to the plan of record; training slots are booked. Thanks for the patience on wave 2." },
    { id: "IT-002", received: "2026-10-01", source_kind: "meeting-notes", author_role: "account lead, segment A-S08", subject: "Client review — A-S08",
      text: "Notes from the client review. 1) Satisfaction steady. 2) The client signed a new division: about 1,200 travelers onboarding starting Nov 9. Account lead expects volume up 15% on the A-S08 gates once they are live. 3) QBR moved to December. Action: WFM to reflect the onboarding in the outlook." },
    { id: "IT-003", received: "2026-10-02", source_kind: "chat", author_role: "account manager, segment A-S08", subject: "",
      text: "heads up for planning — the A-S08 onboarding is confirmed for Nov 9, the 15% bump is real per the account team. they're sending the traveler file next week" },
    { id: "IT-004", received: "2026-10-02", source_kind: "email", author_role: "unknown (forwarded)", subject: "FW: fyi",
      text: `Not sure if this is real but I heard a client is moving 3,000 travelers to self-service on Oct 12. Apparently ${PLANT.fakeSignal} voice could drop 15%. Someone in the hallway mentioned it, might be worth a look.` },
    { id: "IT-005", received: "2026-09-17", source_kind: "ops-note", author_role: "team lead, segment A-S02", subject: "Absence",
      text: `Rough start to the week on ${PLANT.smallAbsence}: 3 of our 8 agents were out sick Monday through Wednesday (flu going around). Backup skills picked up some of it. Everyone is back today.` },
    { id: "IT-006", received: "2026-01-03", source_kind: "chat", author_role: "real-time analyst", subject: "",
      text: "snow in the northeast is wrecking flights today, phones lit up across the NA managed travel gates since 7am. nothing from the weather feed yet" },
    { id: "IT-007", received: "2026-09-29", source_kind: "transcript", author_role: "stand-up (several speakers)", subject: "Daily stand-up",
      text: "SPEAKER 1: Morning. Hurricane fallout still in the queues. SPEAKER 2: Product mentioned the chat timeout change goes live Oct 20 on the online product; chat sessions might go up, maybe 10 percent, not confirmed. SPEAKER 1: Let's get that confirmed before we plan for it. SPEAKER 3: Coffee machine on 4 is fixed." },
    { id: "IT-008", received: "2026-10-01", source_kind: "email", author_role: "scheduling lead, product D", subject: "Columbus Day",
      text: "Reminder from the calendar: for Columbus Day on Oct 12 the agency gates (product D) run reduced hours; expect volume down 40% that day across D. The ESC stays fully open." },
    { id: "IT-009", received: "2026-10-02", source_kind: "email", author_role: "facilities", subject: "Parking",
      text: "The east lot is closed Friday for resurfacing. Please use the garage." },
    { id: "IT-010", received: "2026-10-03", source_kind: "chat", author_role: "team lead, segment C-S03", subject: "",
      text: "great job everyone on yesterday's numbers, thanks for staying late" },
    { id: "IT-011", received: "2026-09-30", source_kind: "meeting-notes", author_role: "vendor review", subject: "Vendor 2 monthly",
      text: "Vendor 2 attrition stable. QA scores up two points. Next review in four weeks. No volume changes discussed." },
  ];
  const A08 = ["G115", "G116", "G117"]; const D = ["G104", "G148", "G149", "G150", "G151", "G152", "G153", "G154", "G155"];
  const labels: Label[] = [
    { item: "IT-001", kind: "forward", type: "migration", gates: [PLANT.migrationFrom, PLANT.migrationTo], start: "2027-02-01", grade: "V", true_claim: true, should_apply: false }, // already in the plan of record
    { item: "IT-002", kind: "forward", type: "client", gates: A08, start: "2026-11-09", direction: "up", pct: 15, grade: "E", true_claim: true, should_apply: true },
    { item: "IT-003", kind: "forward", type: "client", gates: A08, start: "2026-11-09", direction: "up", pct: 15, grade: "E", true_claim: true, should_apply: true },
    { item: "IT-004", kind: "forward", type: "client", gates: [PLANT.fakeSignal], start: "2026-10-12", direction: "down", pct: 15, grade: "U", true_claim: false, should_apply: false },
    { item: "IT-005", kind: "explanation", type: "absence", gates: [PLANT.smallAbsence], start: "2026-09-14", end: "2026-09-16", grade: "E", true_claim: true },
    { item: "IT-006", kind: "explanation", type: "weather", start: "2026-01-03", grade: "E", true_claim: true },
    { item: "IT-007", kind: "forward", type: "platform", start: "2026-10-20", direction: "up", pct: 10, grade: "I", true_claim: true, should_apply: false },
    { item: "IT-008", kind: "forward", type: "calendar", gates: D.filter((g) => g !== PLANT.esc), start: "2026-10-12", end: "2026-10-12", direction: "down", pct: 40, grade: "V", true_claim: true, should_apply: true },
    { item: "IT-009", kind: "none" }, { item: "IT-010", kind: "none" }, { item: "IT-011", kind: "none" },
  ];
  return { items, labels };
}
