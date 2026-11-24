// ===== faecher/religion.js · Religion / Ethik (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";

export default {
  id: "religion", name: L2("Religion / Ethik", "Religion / Ethics"), kurz: "Re", farbe: "#9A8FA8",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "weltreligionen", name: L2("Weltreligionen zuordnen", "Match world religions") }, { id: "dilemma", name: L2("Dilemma-Diskussion", "Dilemma discussion") }],
  themen: [
    { id: "weltreligionen-im-ueberblick", name: L2("Weltreligionen im Überblick", "World religions overview"), klasse: 5, geplant: true },
    { id: "freundschaft-und-verantwortung", name: L2("Freundschaft und Verantwortung", "Friendship and responsibility"), klasse: 7, geplant: true },
    { id: "gerechtigkeit", name: L2("Gerechtigkeit", "Justice"), klasse: 9, geplant: true },
    { id: "philosophische-grundfragen", name: L2("Philosophische Grundfragen", "Basic philosophical questions"), klasse: 10, geplant: true }
  ]
};
