import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../sheets/actors/CharacterCreationApp", () => ({
    CharacterCreationApp: class CharacterCreationApp {
        constructor(_actorName: string, _options: Record<string, unknown>) {}
        render(_force = false): void {}
    },
}));

vi.mock("../../services/character-creation/CharacterCreationService", () => ({
    CharacterCreationService: {
        Instance: () => ({
            ensureDefaultItemsExist: vi.fn(),
            initializeCharacter: vi.fn(),
        }),
    },
}));

describe("preCreateCharacterActor", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
        (globalThis as typeof globalThis & { game: { users: { get: ReturnType<typeof vi.fn> } } }).game = {
            users: {
                get: vi.fn(() => ({ isSelf: true })),
            },
        } as any;
        (globalThis as typeof globalThis & { Hooks: { on: ReturnType<typeof vi.fn> } }).Hooks = {
            on: vi.fn(),
        } as any;
    });

    it("allows character creation that originates from a compendium pack", async () => {
        const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
        const { preCreateCharacterActor } = await import("./displayCharacterCreationDialog");

        const shouldIntercept = preCreateCharacterActor(
            {} as any,
            { type: "character" },
            { pack: "my-pack" },
            "user-1",
        );

        expect(shouldIntercept).toBe(true);
        expect(setTimeoutSpy).not.toHaveBeenCalled();
    });

    it("allows character creation when data.sourceId is set", async () => {
        const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
        const { preCreateCharacterActor } = await import("./displayCharacterCreationDialog");

        const shouldIntercept = preCreateCharacterActor(
            {} as any,
            { type: "character", sourceId: "Compendium.myPack.abc123" },
            {},
            "user-1",
        );

        expect(shouldIntercept).toBe(true);
        expect(setTimeoutSpy).not.toHaveBeenCalled();
    });

    it("allows character creation when data.flags.core.sourceId is set", async () => {
        const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
        const { preCreateCharacterActor } = await import("./displayCharacterCreationDialog");

        const shouldIntercept = preCreateCharacterActor(
            {} as any,
            { type: "character", flags: { core: { sourceId: "Compendium.myPack.abc123" } } },
            {},
            "user-1",
        );

        expect(shouldIntercept).toBe(true);
        expect(setTimeoutSpy).not.toHaveBeenCalled();
    });
});
