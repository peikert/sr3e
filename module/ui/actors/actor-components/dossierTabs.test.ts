import { describe, expect, it } from "vitest";
import { canShowGrimoireTab } from "./dossierTabs";

describe("canShowGrimoireTab", () => {
   it("shows the grimoire tab when magic is above zero and the actor is not burned out", () => {
      expect(canShowGrimoireTab(1, false)).toBe(true);
      expect(canShowGrimoireTab(6, false)).toBe(true);
   });

   it("hides the grimoire tab when magic is zero or the actor is burned out", () => {
      expect(canShowGrimoireTab(0, false)).toBe(false);
      expect(canShowGrimoireTab(1, true)).toBe(false);
      expect(canShowGrimoireTab(0, true)).toBe(false);
   });
});
