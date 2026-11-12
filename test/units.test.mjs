import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const units = JSON.parse(readFileSync(new URL("../data/units.json", import.meta.url), "utf8")).units;
const f = (id) => {
  const u = units.find((x) => x.id === id);
  assert.ok(u, `unit ${id} not found`);
  return u.num / u.den;
};

const cases = [
  ["10寸=1尺", () => 10 * f("sun"), () => f("shaku")],
  ["10尺=1丈", () => 10 * f("shaku"), () => f("jo")],
  ["6尺=1間", () => 6 * f("shaku"), () => f("ken")],
  ["60間=1町", () => 60 * f("ken"), () => f("cho")],
  ["36町=1里", () => 36 * f("cho"), () => f("ri")],
  ["1.25尺=1鯨尺", () => 1.25 * f("shaku"), () => f("kujira")],
  ["121坪=400㎡", () => 121 * f("tsubo"), () => 400],
  ["300坪=1反", () => 300 * f("tsubo"), () => f("tan")],
  ["10反=1町歩", () => 10 * f("tan"), () => f("chobu")],
  ["30坪=1畝", () => 30 * f("tsubo"), () => f("se")],
  ["10合=1升", () => 10 * f("go"), () => f("sho")],
  ["10升=1斗", () => 10 * f("sho"), () => f("to")],
  ["10斗=1石", () => 10 * f("to"), () => f("koku")],
  ["1000匁=1貫", () => 1000 * f("monme"), () => f("kan")],
  ["16両=1斤", () => 16 * f("ryo"), () => f("kin")],
  ["尺×尺×寸=才", () => f("shaku") ** 2 * f("sun"), () => f("sai")],
];

for (const [name, got, want] of cases) {
  test(name, () => {
    const a = got();
    const b = want();
    const rel = Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));
    assert.ok(rel < 1e-9, `${name}: ${a} != ${b}`);
  });
}

test("畳4規格の大小関係", () => {
  assert.ok(f("tatami-kyo") > f("tatami-chukyo"));
  assert.ok(f("tatami-chukyo") > f("tatami-edo"));
  assert.ok(f("tatami-edo") > f("tatami-danchi"));
  assert.ok(f("tatami-danchi") > 1.4);
});
