// Ported from eo-modulator-atlas engine/tests/params-expressions.test.mjs at eb97f96 (GPL-3.0-or-later).
// Local changes: import path -> ../src/params/params.mjs; the free-text config test (needs EO config.mjs) is dropped.
// params.mjs: expression parser, evaluator, unsafe-input rejection, parameter resolution and unit checks (DevLog-026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, evaluateExpression, resolveParams, substituteExpressions, unitOfKey, referencedNames } from '../src/params/params.mjs';

const ev = (s, v = {}) => evaluateExpression(s, v);

test('params: arithmetic, precedence and associativity', () => {
  assert.equal(ev('1 + 2 * 3'), 7);
  assert.equal(ev('(1 + 2) * 3'), 9);
  assert.equal(ev('2 ^ 3 ^ 2'), 512); // right associative
  assert.equal(ev('-2 ^ 2'), -4); // ^ binds tighter than unary minus
  assert.equal(ev('2 ^ -1'), 0.5);
  assert.equal(ev('--3'), 3);
  assert.equal(ev('+3 - -2'), 5);
  assert.equal(ev('8 / 4 / 2'), 1); // left associative
  assert.equal(ev('10 - 4 - 3'), 3);
  assert.equal(ev('1.5e3 + .5 + 2.'), 1502.5);
  assert.equal(ev('2E-3 * 1000'), 2);
  assert.ok(Math.abs(ev('sin(pi / 2) + cos(0) + tan(0)') - 2) < 1e-15);
  assert.equal(ev('min(3, 1, 2) + max(4, 5) + sqrt(16) + abs(-2)'), 12);
  assert.equal(ev('a * b - c', { a: 2, b: 3, c: 1 }), 5);
  assert.equal(ev('  gap_um/2  ', { gap_um: 3 }), 1.5);
});

test('params: parse errors are readable and positioned', () => {
  for (const [src, re] of [
    ['', /unexpected end/], ['1 +', /unexpected end/], ['(1 + 2', /expected '\)'/], ['1 + 2)', /unexpected '\)'/],
    ['2 3', /unexpected 'num'/], ['sqrt(1, 2)', /takes 1 argument/], ['min()', /at least 1/], ['foo(1)', /unknown function 'foo'/],
    ['sqrt + 1', /needs parentheses/], ['1,2', /unexpected ','/], ['1 ** 2', /unexpected '\*'/],
  ]) assert.throws(() => parseExpression(src), re, src);
  assert.throws(() => ev('x + 1'), /unknown parameter 'x'/);
  assert.throws(() => ev('1 / 0'), /division by zero/);
  assert.throws(() => ev('sqrt(-1)'), /not a finite number/);
  assert.throws(() => ev('10 ^ 400'), /not a finite number/);
});

test('params: unsafe input is rejected, never executed', () => {
  globalThis.__exprProbe = 0;
  const hostile = [
    'process.exit(1)', 'globalThis.__exprProbe = 1', 'this', 'constructor.constructor("return 1")()', 'a.b', 'x[0]', '`1`', "'1'", '"1"',
    '1; 2', 'eval(1)', 'Function("x")', 'require("fs")', 'import("fs")', '__proto__', 'a => a', '1 ? 2 : 3', '!1', '1 && 2', '{}', '[1]', '$x', '1 // 2', 'x\n+1',
  ];
  for (const src of hostile) assert.throws(() => evaluateExpression(src, {}), Error, src);
  assert.equal(globalThis.__exprProbe, 0);
  // Names that exist on Object.prototype are not parameters.
  for (const name of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) assert.throws(() => evaluateExpression(name, {}), /unknown parameter|unexpected/, name);
  assert.throws(() => parseExpression('1+'.repeat(400) + '1'), /longer than/);
  assert.throws(() => parseExpression('('.repeat(80) + '1' + ')'.repeat(80)), /nesting too deep/);
  delete globalThis.__exprProbe;
});

test('params: resolution with dependencies, overrides and cycles', () => {
  const { values, defs } = resolveParams({
    gap_um: { value: 3, unit: 'um', description: 'gap' }, half_um: { value: '=gap_um / 2', unit: 'um' }, n: 4, w: '=n * 2',
  });
  assert.deepEqual(values, { gap_um: 3, half_um: 1.5, n: 4, w: 8 });
  assert.equal(defs.half_um.expression, 'gap_um / 2');
  assert.equal(resolveParams({ gap_um: { value: 3 }, half_um: { value: '=gap_um / 2' } }, { gap_um: 5 }).values.half_um, 2.5);
  assert.throws(() => resolveParams({ a: { value: '=b' }, b: { value: '=a + 1' } }), /circular reference a -> b -> a/);
  assert.throws(() => resolveParams({ a: { value: '=zz' } }), /unknown parameter 'zz'/);
  assert.throws(() => resolveParams({ a: { value: 1 } }, { b: 2 }), /unknown parameter 'b'/);
  assert.throws(() => resolveParams({ a: { value: 1 } }, { a: '2' }), /finite number/);
  assert.throws(() => resolveParams({ pi: 1 }), /invalid parameter name/);
  assert.throws(() => resolveParams({ sqrt: 1 }), /invalid parameter name/);
  assert.throws(() => resolveParams({ '1x': 1 }), /invalid parameter name/);
  assert.throws(() => resolveParams({ a: { value: 'abc' } }), /expression string starting with '='/);
  assert.throws(() => resolveParams({ a: { value: 1, units: 'um' } }), /unsupported field/);
});

test('params: substitution of marked strings only, unit check against key suffixes', () => {
  const values = { gap_um: 3, lam_nm: 738, w_um: 2, k: 2 };
  const units = { gap_um: 'um', lam_nm: 'nm', w_um: 'um', k: null };
  const { tree, substitutions } = substituteExpressions({
    title: 'gap = 3 um', material: 'gold', rect: { x_um: ['=-gap_um/2', '=gap_um/2 + w_um'], y_um: [0, 1] },
    optics: { wavelength_nm: '=lam_nm' }, params: { keep: '=nonexistent' }, scale: '=k * 3',
  }, values, units, { skip: ['params'] });
  assert.deepEqual(tree.rect.x_um, [-1.5, 3.5]);
  assert.equal(tree.optics.wavelength_nm, 738);
  assert.equal(tree.title, 'gap = 3 um');
  assert.equal(tree.material, 'gold');
  assert.equal(tree.params.keep, '=nonexistent'); // skipped subtree untouched
  assert.equal(tree.scale, 6);
  assert.deepEqual(substitutions.map((s) => s.path), ['rect.x_um[0]', 'rect.x_um[1]', 'optics.wavelength_nm', 'scale']);
  assert.ok(substitutions[0].unitChecked && !substitutions[3].unitChecked);
  assert.throws(() => substituteExpressions({ rect: { x_um: ['=lam_nm', 1] } }, values, units), /parameter in nm into a key in um/);
  assert.throws(() => substituteExpressions({ a_um: '=-lam_nm + 1' }, values, units), /nm into a key in um/);
  // Products of params are not unit-checked (shape outside the checked subset).
  assert.equal(substituteExpressions({ a_um: '=lam_nm * gap_um / 1000' }, values, units).tree.a_um, 2.214);
  assert.throws(() => substituteExpressions({ a_um: '=missing + 1' }, values, units), /a_um: expression "missing \+ 1" references unknown parameter 'missing'/);
  assert.equal(unitOfKey('f_stop_ghz'), 'GHz');
  assert.equal(unitOfKey('sidewall_angle_deg'), 'deg');
  assert.equal(unitOfKey('name'), null);
  assert.deepEqual(referencedNames(parseExpression('max(a, b) + a * pi')), ['a', 'b']);
});

test('params: unit rules of audit A5 (conversions, scaled terms, mixed sums at any depth, param values)', () => {
  const values = { gap_um: 3, w_nm: 600, w_um: 2 };
  const units = { gap_um: 'um', w_nm: 'nm', w_um: 'um' };
  const sub = (tree) => substituteExpressions(tree, values, units);
  // A scaled param may be a unit conversion: accepted, not marked checked.
  let r = sub({ x_um: '=w_nm / 1000' });
  assert.equal(r.tree.x_um, 0.6);
  assert.equal(r.substitutions[0].unitChecked, false);
  assert.equal(sub({ x_um: '=0.001 * w_nm' }).substitutions[0].unitChecked, false);
  // Scaling an um param into an um key is checked; 1 * param is exact.
  assert.equal(sub({ x_um: '=0.5 * gap_um' }).substitutions[0].unitChecked, true);
  assert.throws(() => sub({ x_um: '=1 * w_nm' }), /nm into a key in um/);
  // Exact params in different units inside any sum are rejected, also inside parentheses or min/max.
  assert.throws(() => sub({ x_um: '=(gap_um + w_nm) / 2' }), /different units \(um, nm\)/);
  assert.throws(() => sub({ x_um: '=max(gap_um, w_nm)' }), /different units/);
  assert.throws(() => sub({ note_free: '=gap_um - w_nm' }), /different units/);
  // A conversion inside a sum is allowed: exact um plus scaled nm.
  r = sub({ x_um: '=gap_um + w_nm / 1000' });
  assert.equal(r.tree.x_um, 3.6);
  assert.equal(r.substitutions[0].unitChecked, true);
  // Param value expressions are checked against the param unit.
  assert.throws(() => resolveParams({ a_nm: { value: 600, unit: 'nm' }, b_um: { value: '=a_nm', unit: 'um' } }), /params.b_um.value: .*nm into a key in um/);
  assert.equal(resolveParams({ a_nm: { value: 600, unit: 'nm' }, b_um: { value: '=a_nm / 1000', unit: 'um' } }).values.b_um, 0.6);
  assert.throws(() => resolveParams({ a_nm: { value: 600, unit: 'nm' }, g_um: { value: 1, unit: 'um' }, s: { value: '=a_nm + g_um' } }), /different units/);
});


// L1 addition (not in EO): smoke test of the ported units module (EO postproc/units.mjs).
test('units: parse, SI factor, dimension check and formatting', async () => {
  const { parseUnit, formatUnit, displayConversion, UnitError } = await import('../src/params/units.mjs');
  const u = parseUnit('W/(m*um)');
  assert.ok(Math.abs(u.factor - 1e6) < 1e-6);
  assert.equal(formatUnit(parseUnit('W').dim), 'W');
  assert.equal(displayConversion(parseUnit('m').dim, 'mm').factor, 1e-3);
  assert.throws(() => displayConversion(parseUnit('m').dim, 'W'), UnitError);
});

// L1 wave 2: temperature as a fifth base dimension (local change to the EO port).
test('units: K dimension for thermal units; EO 4-entry dimension vectors unchanged', async () => {
  const { parseUnit, formatUnit, dimEq, dimMul, DIMLESS, BASE_UNITS } = await import('../src/params/units.mjs');
  assert.deepEqual(BASE_UNITS, ['m', 'kg', 's', 'A', 'K']);
  const k = parseUnit('W/(m K)');
  assert.deepEqual(k.dim, [1, 1, -3, 0, -1]);
  assert.equal(formatUnit(k.dim), 'W/(m*K)');
  assert.equal(formatUnit(parseUnit('W/(m2 K)'.replace('m2', 'm^2')).dim), 'W/(m^2*K)');
  assert.equal(formatUnit(parseUnit('K/W').dim), 'K/W');
  assert.equal(formatUnit(parseUnit('J/(kg*K)').dim), 'J/(kg*K)');
  const ppm = parseUnit('ppm/K');
  assert.ok(Math.abs(ppm.factor - 1e-6) < 1e-21);
  assert.equal(formatUnit(ppm.dim), '1/K');
  assert.ok(Math.abs(parseUnit('mK').factor - 1e-3) < 1e-18);
  assert.ok(Math.abs(parseUnit('W/(cm*K)').factor - 100) < 1e-9);
  // 4-entry vectors (EO callers) compare and combine as before
  assert.ok(dimEq([1, 1, -3, -1], parseUnit('V/m').dim));
  assert.deepEqual(dimMul([1, 0, 0, 0], [0, 0, 1, 0]), [1, 0, 1, 0, 0]);
  assert.ok(dimEq(DIMLESS, [0, 0, 0, 0]));
  assert.equal(formatUnit([2, 1, -3, -1]), 'V');
});
