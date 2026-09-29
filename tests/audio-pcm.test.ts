import assert from "node:assert/strict";
import test from "node:test";
import { encodePcm16 } from "../src/lib/audio-pcm.ts";

test("encodes signed 16-bit mono PCM in little-endian order", () => {
  const pcm = encodePcm16([Float32Array.of(-1, -0.5, 0, 0.5, 1)]);
  const view = new DataView(pcm);
  assert.equal(pcm.byteLength, 10);
  assert.deepEqual(
    Array.from({ length: 5 }, (_, index) => view.getInt16(index * 2, true)),
    [-32768, -16384, 0, 16384, 32767],
  );
});

test("mixes channels and clamps samples before encoding", () => {
  const pcm = encodePcm16([
    Float32Array.of(1, 2, -1),
    Float32Array.of(-1, 2, -1),
  ]);
  const view = new DataView(pcm);
  assert.deepEqual(
    Array.from({ length: 3 }, (_, index) => view.getInt16(index * 2, true)),
    [0, 32767, -32768],
  );
});

test("rejects empty or inconsistent audio", () => {
  assert.throws(() => encodePcm16([]), /пустой или повреждённой/);
  assert.throws(
    () => encodePcm16([Float32Array.of(0), Float32Array.of(0, 1)]),
    /пустой или повреждённой/,
  );
});
