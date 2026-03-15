import { describe, it, expect } from "vitest";
import { parseSongtext } from "../../src/lib/import/songtext-parser";

describe("parseSongtext", () => {
  it("returns empty strophen for empty text", () => {
    const result = parseSongtext("");
    expect(result).toEqual({ strophen: [] });
  });

  it("returns empty strophen for only blank lines", () => {
    const result = parseSongtext("\n\n\n   \n  \n");
    expect(result).toEqual({ strophen: [] });
  });

  it("returns empty strophen for only noise lines", () => {
    const result = parseSongtext(
      "You might also like\n42 Embed\n3 Contributors\nSee Blink-182 live\nGet tickets as low as $20"
    );
    expect(result).toEqual({ strophen: [] });
  });

  it("handles mixed markers and blank-line separation correctly", () => {
    const text = [
      "[Verse 1]",
      "Line one",
      "Line two",
      "",
      "[Chorus]",
      "Chorus line one",
      "Chorus line two",
      "",
      "Orphan line after blank",
    ].join("\n");

    const result = parseSongtext(text);
    expect(result.strophen).toHaveLength(3);
    expect(result.strophen[0]).toEqual({ name: "Verse 1", zeilen: ["Line one", "Line two"] });
    expect(result.strophen[1]).toEqual({ name: "Chorus", zeilen: ["Chorus line one", "Chorus line two"] });
    expect(result.strophen[2]).toEqual({ name: "Verse", zeilen: ["Orphan line after blank"] });
  });

  it("returns a single strophe named 'Verse' for text without markers or blank lines", () => {
    const text = "Line one\nLine two\nLine three";
    const result = parseSongtext(text);
    expect(result.strophen).toHaveLength(1);
    expect(result.strophen[0]).toEqual({
      name: "Verse",
      zeilen: ["Line one", "Line two", "Line three"],
    });
  });

  it("auto-names strophes 'Verse 1', 'Verse 2', etc. for blank-line separation without markers", () => {
    const text = "Line A\nLine B\n\nLine C\nLine D\n\nLine E";
    const result = parseSongtext(text);
    expect(result.strophen).toHaveLength(3);
    expect(result.strophen[0]).toEqual({ name: "Verse 1", zeilen: ["Line A", "Line B"] });
    expect(result.strophen[1]).toEqual({ name: "Verse 2", zeilen: ["Line C", "Line D"] });
    expect(result.strophen[2]).toEqual({ name: "Verse 3", zeilen: ["Line E"] });
  });

  describe("Songtext-Sample from .planning/Songtext-Sample.md", () => {
    const sampleText = `[Verse 1]
In the car, I just can't wait
To pick you up on our very first date
Is it cool if I hold your hand?
Is it wrong if I think it's lame to dance?
Do you like my stupid hair?
Would you guess that I didn't know what to wear?
I'm just scared of what you think
You make me nervous, so I really can't eat

[Chorus]
Let's go, don't wait
This night's almost over
Honest, let's make
This night last forever
Forever and ever
Let's make this last forever
Forever and ever
Let's make this last forever

[Verse 2]
When you smile, I melt inside
I'm not worthy for a minute of your time
I really wish it was only me and you
I'm jealous of everybody in the room
Please don't look at me with those eyes
Please don't hint that you're capable of lies
I dread the thought of our very first kiss
A target that I'm probably gonna miss
You might also like
TURN THIS OFF!
blink-182
TURPENTINE
blink-182
I Miss You
blink-182
[Chorus]
Let's go, don't wait
This night's almost over
Honest, let's make
This night last forever
Forever and ever
Let's make this last forever
Forever and ever
Let's make this last forever

[Instrumental Bridge]

[Chorus]
Let's go, don't wait
This night's almost over
Honest, let's make
This night last forever
Forever and ever
Let's make this last forever
Forever and ever
Let's make this last forever
Forever and ever
Let's make this last forever
Forever and ever
Let's make this last forever`;

    it("produces the correct number of strophes", () => {
      const result = parseSongtext(sampleText);
      // Verse 1, Chorus, Verse 2, Chorus, Chorus (Instrumental Bridge is empty → skipped)
      expect(result.strophen).toHaveLength(5);
    });

    it("assigns correct strophe names", () => {
      const result = parseSongtext(sampleText);
      const names = result.strophen.map((s) => s.name);
      expect(names).toEqual(["Verse 1", "Chorus", "Verse 2", "Chorus", "Chorus"]);
    });

    it("Verse 1 has 8 lines", () => {
      const result = parseSongtext(sampleText);
      expect(result.strophen[0].zeilen).toHaveLength(8);
    });

    it("first Chorus has 8 lines", () => {
      const result = parseSongtext(sampleText);
      expect(result.strophen[1].zeilen).toHaveLength(8);
    });

    it("Verse 2 has 14 lines (noise 'You might also like' filtered, other lines kept)", () => {
      const result = parseSongtext(sampleText);
      // 8 original + TURN THIS OFF! + blink-182 + TURPENTINE + blink-182 + I Miss You + blink-182 = 14
      expect(result.strophen[2].zeilen).toHaveLength(14);
      expect(result.strophen[2].zeilen).not.toContain("You might also like");
      expect(result.strophen[2].zeilen).toContain("TURN THIS OFF!");
      expect(result.strophen[2].zeilen).toContain("blink-182");
    });

    it("second Chorus has 8 lines", () => {
      const result = parseSongtext(sampleText);
      expect(result.strophen[3].zeilen).toHaveLength(8);
    });

    it("last Chorus has 12 lines", () => {
      const result = parseSongtext(sampleText);
      expect(result.strophen[4].zeilen).toHaveLength(12);
    });

    it("[Instrumental Bridge] does not produce a strophe (empty section)", () => {
      const result = parseSongtext(sampleText);
      const names = result.strophen.map((s) => s.name);
      expect(names).not.toContain("Instrumental Bridge");
    });
  });
});
