import { describe, expect, it } from "vitest";

import { classifyPointer, classifyUserAgent } from "./deviceInfo";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const WIN_EDGE =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0";
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const WIN_FIREFOX =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0";
const IOS_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.0.0 Mobile/15E148 Safari/604.1";

describe("classifyUserAgent", () => {
  it("reconoce iPhone con Safari", () => {
    expect(classifyUserAgent(IPHONE, 5)).toEqual({
      platform: "iOS",
      browser: "Safari",
    });
  });

  it("reconoce Android con Chrome", () => {
    expect(classifyUserAgent(ANDROID_CHROME, 5)).toEqual({
      platform: "Android",
      browser: "Chrome",
    });
  });

  it("Edge gana sobre Chrome", () => {
    expect(classifyUserAgent(WIN_EDGE, 0)).toEqual({
      platform: "Windows",
      browser: "Edge",
    });
  });

  it("Chrome en iPhone es iOS y Chrome, no Safari", () => {
    expect(classifyUserAgent(IOS_CHROME, 5)).toEqual({
      platform: "iOS",
      browser: "Chrome",
    });
  });

  it("Firefox", () => {
    expect(classifyUserAgent(WIN_FIREFOX, 0).browser).toBe("Firefox");
  });

  it("un Mac sin pantalla tactil es macOS", () => {
    expect(classifyUserAgent(MAC_SAFARI, 0)).toEqual({
      platform: "macOS",
      browser: "Safari",
    });
  });

  it("un 'Mac' con pantalla tactil es un iPad", () => {
    expect(classifyUserAgent(MAC_SAFARI, 5).platform).toBe("iOS");
  });

  it("lo desconocido queda como otro", () => {
    expect(classifyUserAgent("curl/8.0", 0)).toEqual({
      platform: "otro",
      browser: "otro",
    });
  });
});

describe("classifyPointer", () => {
  it("puntero principal tactil", () => {
    expect(classifyPointer({ primaryCoarse: true, anyCoarse: true })).toBe(
      "touch",
    );
  });

  it("mouse con pantalla tactil secundaria es mixto", () => {
    expect(classifyPointer({ primaryCoarse: false, anyCoarse: true })).toBe(
      "mixed",
    );
  });

  it("solo mouse", () => {
    expect(classifyPointer({ primaryCoarse: false, anyCoarse: false })).toBe(
      "mouse",
    );
  });
});
