// Ported from eo-modulator-atlas engine/src/params.mjs at eb97f96 (GPL-3.0-or-later).
// Local changes: none (verbatim copy).
// Config parameters and a safe arithmetic expression evaluator (DevLog-023 D5, DevLog-026).
// Own recursive-descent parser: numbers, parameter names, + - * / ^, parentheses, unary minus, the functions
// min max sqrt abs sin cos tan and the constant pi. No eval, no Function, no property access. GPL-3.0-or-later.
//
// Expression strings in a config start with `=` ("=-gap_um/2"); every other string keeps its literal meaning.
// Trigonometric functions take radians. `^` is right associative and binds tighter than unary minus (-2^2 = -4).

export const EXPRESSION_PREFIX = '=';
export const MAX_EXPRESSION_LENGTH = 500;
export const MAX_PARAMS = 500;
const MAX_DEPTH = 64;
const FUNCTIONS = {
  min: { arity: [1, Infinity], f: (...a) => Math.min(...a) },
  max: { arity: [1, Infinity], f: (...a) => Math.max(...a) },
  sqrt: { arity: [1, 1], f: Math.sqrt },
  abs: { arity: [1, 1], f: Math.abs },
  sin: { arity: [1, 1], f: Math.sin },
  cos: { arity: [1, 1], f: Math.cos },
  tan: { arity: [1, 1], f: Math.tan },
};
const CONSTANTS = { pi: Math.PI };
const RESERVED = new Set([...Object.keys(FUNCTIONS), ...Object.keys(CONSTANTS)]);
export const PARAM_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Unit implied by a config key suffix (SPEC unit convention); null when the key carries none. */
const SUFFIX_UNITS = [['_um', 'um'], ['_nm', 'nm'], ['_mm', 'mm'], ['_ghz', 'GHz'], ['_ohm', 'ohm'], ['_deg', 'deg'], ['_Sm', 'S/m']];
export function unitOfKey(key) {
  if (typeof key !== 'string') return null;
  for (const [s, u] of SUFFIX_UNITS) if (key.endsWith(s)) return u;
  return null;
}
const UNIT_ALIASES = { um: 'um', 'µm': 'um', 'μm': 'um', micron: 'um', nm: 'nm', mm: 'mm', ghz: 'GHz', GHz: 'GHz', ohm: 'ohm', Ohm: 'ohm', deg: 'deg', degree: 'deg', 'S/m': 'S/m', '1': '1', '': '1', none: '1' };
export const normalizeUnit = (u) => (u == null ? null : Object.hasOwn(UNIT_ALIASES, u) ? UNIT_ALIASES[u] : String(u));

class ExprError extends Error {}
const err = (expr, pos, msg) => { throw new ExprError(`expression "${expr}": ${msg}${pos == null ? '' : ` at position ${pos + 1}`}`); };

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if ((c >= '0' && c <= '9') || (c === '.' && src[i + 1] >= '0' && src[i + 1] <= '9')) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      tokens.push({ t: 'num', v: Number(m[0]), pos: i });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
      tokens.push({ t: 'name', v: m[0], pos: i });
      i += m[0].length;
      continue;
    }
    if ('+-*/^(),'.includes(c)) { tokens.push({ t: c, pos: i }); i++; continue; }
    err(src, i, `unexpected character '${c}'`);
  }
  tokens.push({ t: 'end', pos: src.length });
  return tokens;
}

/**
 * Parse an arithmetic expression (without the leading `=`) into an AST.
 * Node kinds: {k:'num', v}, {k:'ref', name}, {k:'neg', a}, {k:'bin', op, a, b}, {k:'call', name, args}.
 * @param {string} src
 */
export function parseExpression(src) {
  if (typeof src !== 'string') throw new ExprError('expression must be a string');
  if (src.length > MAX_EXPRESSION_LENGTH) throw new ExprError(`expression longer than ${MAX_EXPRESSION_LENGTH} characters`);
  const toks = tokenize(src);
  let p = 0;
  let depth = 0;
  const peek = () => toks[p];
  const take = (t) => {
    if (toks[p].t !== t) err(src, toks[p].pos, `expected '${t}'${toks[p].t === 'end' ? ' before the end' : ''}`);
    return toks[p++];
  };
  const enter = () => { if (++depth > MAX_DEPTH) err(src, toks[p].pos, 'nesting too deep'); };
  // expr := term (('+'|'-') term)*
  function expr() {
    enter();
    let a = term();
    while (peek().t === '+' || peek().t === '-') { const op = toks[p++].t; a = { k: 'bin', op, a, b: term() }; }
    depth--;
    return a;
  }
  // term := unary (('*'|'/') unary)*
  function term() {
    let a = unary();
    while (peek().t === '*' || peek().t === '/') { const op = toks[p++].t; a = { k: 'bin', op, a, b: unary() }; }
    return a;
  }
  // unary := '-' unary | '+' unary | power
  function unary() {
    if (peek().t === '-') { p++; enter(); const a = unary(); depth--; return { k: 'neg', a }; }
    if (peek().t === '+') { p++; enter(); const a = unary(); depth--; return a; }
    return power();
  }
  // power := primary ('^' unary)?   (right associative; the exponent may carry a sign)
  function power() {
    const a = primary();
    if (peek().t === '^') { p++; enter(); const b = unary(); depth--; return { k: 'bin', op: '^', a, b }; }
    return a;
  }
  function primary() {
    const tk = peek();
    if (tk.t === 'num') { p++; return { k: 'num', v: tk.v }; }
    if (tk.t === '(') { p++; const a = expr(); take(')'); return a; }
    if (tk.t === 'name') {
      p++;
      if (peek().t === '(') {
        if (!Object.hasOwn(FUNCTIONS, tk.v)) err(src, tk.pos, `unknown function '${tk.v}' (allowed: ${Object.keys(FUNCTIONS).join(', ')})`);
        p++;
        const args = [];
        if (peek().t !== ')') { args.push(expr()); while (peek().t === ',') { p++; args.push(expr()); } }
        take(')');
        const [lo, hi] = FUNCTIONS[tk.v].arity;
        if (args.length < lo || args.length > hi) err(src, tk.pos, `${tk.v} takes ${lo === hi ? lo : `at least ${lo}`} argument${lo === 1 && hi === 1 ? '' : 's'}`);
        return { k: 'call', name: tk.v, args };
      }
      if (Object.hasOwn(FUNCTIONS, tk.v)) err(src, tk.pos, `function '${tk.v}' needs parentheses`);
      if (Object.hasOwn(CONSTANTS, tk.v)) return { k: 'num', v: CONSTANTS[tk.v], name: tk.v };
      return { k: 'ref', name: tk.v };
    }
    err(src, tk.pos, tk.t === 'end' ? 'unexpected end of expression' : `unexpected '${tk.t}'`);
  }
  const ast = expr();
  if (peek().t !== 'end') err(src, peek().pos, `unexpected '${peek().t}'`);
  return ast;
}

/** Parameter names referenced by an AST (sorted, unique). */
export function referencedNames(ast) {
  const out = new Set();
  const walk = (n) => {
    if (n.k === 'ref') out.add(n.name);
    else if (n.k === 'neg') walk(n.a);
    else if (n.k === 'bin') { walk(n.a); walk(n.b); }
    else if (n.k === 'call') n.args.forEach(walk);
  };
  walk(ast);
  return [...out].sort();
}

/** Evaluate an AST with parameter values; a non-finite result is an error. */
export function evaluateAst(ast, values, src = '') {
  const ev = (n) => {
    switch (n.k) {
      case 'num': return n.v;
      case 'ref':
        if (!Object.hasOwn(values, n.name)) throw new ExprError(`expression "${src}": unknown parameter '${n.name}'`);
        return values[n.name];
      case 'neg': return -ev(n.a);
      case 'bin': {
        const a = ev(n.a), b = ev(n.b);
        if (n.op === '+') return a + b;
        if (n.op === '-') return a - b;
        if (n.op === '*') return a * b;
        if (n.op === '/') { if (b === 0) throw new ExprError(`expression "${src}": division by zero`); return a / b; }
        return a ** b;
      }
      case 'call': return FUNCTIONS[n.name].f(...n.args.map(ev));
      default: throw new ExprError(`expression "${src}": invalid node`);
    }
  };
  const v = ev(ast);
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ExprError(`expression "${src}": result is not a finite number (${v})`);
  return v;
}

/** Parse and evaluate in one step (expression text without the leading `=`). */
export function evaluateExpression(src, values = {}) {
  return evaluateAst(parseExpression(src), values, src);
}

export const isExpression = (v) => typeof v === 'string' && v.startsWith(EXPRESSION_PREFIX);

/**
 * Unit of an expression for the key-suffix check (audit A5, 2026-10-15). Result kinds:
 *   {kind: 'num'}              plain number (takes the unit of the key)
 *   {kind: 'exact', unit}      a param, +- a param, 1 * param, a sum of those (all exact terms must share the unit)
 *   {kind: 'scaled', unit}     a param scaled by a number other than 1 (may be a unit conversion, e.g. w_nm / 1000)
 *   {kind: 'unknown'}          products of params, functions of params, params without a unit
 * Exact terms with different units inside any sum (or min/max/abs) are an error at any nesting depth.
 */
export function expressionUnit(ast, units, src = '') {
  const NUM = { kind: 'num' }, UNKNOWN = { kind: 'unknown' };
  const isOne = (n) => n.k === 'num' && n.v === 1;
  const combine = (parts) => {
    const exact = [...new Set(parts.filter((q) => q.kind === 'exact').map((q) => q.unit))];
    if (exact.length > 1) throw new ExprError(`expression "${src}": adds quantities in different units (${exact.join(', ')})`);
    if (exact.length) return { kind: 'exact', unit: exact[0] };
    if (parts.every((q) => q.kind === 'num')) return NUM;
    const scaled = [...new Set(parts.filter((q) => q.kind === 'scaled').map((q) => q.unit))];
    return scaled.length === 1 && parts.every((q) => q.kind !== 'unknown') ? { kind: 'scaled', unit: scaled[0] } : UNKNOWN;
  };
  const scale = (q) => (q.kind === 'exact' || q.kind === 'scaled' ? { kind: 'scaled', unit: q.unit } : q.kind === 'num' ? NUM : UNKNOWN);
  const walk = (n) => {
    switch (n.k) {
      case 'num': return NUM;
      case 'ref': {
        const u = units[n.name];
        if (u == null) return UNKNOWN;
        return u === '1' ? NUM : { kind: 'exact', unit: u };
      }
      case 'neg': return walk(n.a);
      case 'bin': {
        const a = walk(n.a), b = walk(n.b);
        if (n.op === '+' || n.op === '-') return combine([a, b]);
        if (n.op === '*') {
          if (isOne(n.a)) return b;
          if (isOne(n.b)) return a;
          if (a.kind === 'num' && b.kind === 'num') return NUM;
          if (a.kind === 'num') return scale(b);
          if (b.kind === 'num') return scale(a);
          return UNKNOWN;
        }
        if (n.op === '/') {
          if (isOne(n.b)) return a;
          if (a.kind === 'num' && b.kind === 'num') return NUM;
          if (b.kind === 'num') return scale(a);
          return UNKNOWN;
        }
        return a.kind === 'num' && b.kind === 'num' ? NUM : UNKNOWN; // ^
      }
      case 'call': {
        const args = n.args.map(walk);
        if (['min', 'max', 'abs'].includes(n.name)) return combine(args);
        return args.every((q) => q.kind === 'num') ? NUM : UNKNOWN;
      }
      default: return UNKNOWN;
    }
  };
  return walk(ast);
}

/**
 * Check an expression against the unit a key (or a param) declares. Returns true when the unit was verified, false
 * when the shape is outside the checked subset; throws on a mismatch of an exact-unit expression.
 */
function checkUnit(ast, units, want, src, where) {
  let u;
  // Mixed exact units in a sum are an error even where the key carries no unit.
  try { u = expressionUnit(ast, units, src); } catch (e) { throw new Error(`${where}: ${e.message}`); }
  if (!want || want === '1') return false;
  if (u.kind === 'exact') {
    if (u.unit !== want) throw new Error(`${where}: expression "${src}" combines a parameter in ${u.unit} into a key in ${want}`);
    return true;
  }
  return u.kind === 'scaled' && u.unit === want;
}

/**
 * Validated parameter definitions and their resolved values.
 * `params` entries: name -> {value: number | "=expr", unit?: string, description?: string} (a bare number is accepted).
 * Overrides replace a parameter's value (numbers only). Values may reference other params; cycles are errors.
 * @param {any} raw the `params` block (or undefined)
 * @param {Record<string, number>} [overrides]
 * @returns {{values: Record<string, number>, defs: Record<string, {value:any, unit:string|null, description:string|null, expression:string|null, overridden:boolean}>}}
 */
export function resolveParams(raw, overrides = {}) {
  const defs = Object.create(null);
  if (raw != null) {
    if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('params: expected an object name -> {value, unit, description}');
    const names = Object.keys(raw);
    if (names.length > MAX_PARAMS) throw new Error(`params: at most ${MAX_PARAMS} parameters`);
    for (const name of names) {
      const p = `params.${name}`;
      if (!PARAM_NAME.test(name) || RESERVED.has(name) || name === '__proto__') throw new Error(`${p}: invalid parameter name (letters, digits, underscore; not a function or constant name)`);
      let d = raw[name];
      if (typeof d === 'number' || typeof d === 'string') d = { value: d };
      if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error(`${p}: expected {value, unit, description}`);
      for (const k of Object.keys(d)) if (!['value', 'unit', 'description'].includes(k)) throw new Error(`${p}.${k}: unsupported field`);
      if (d.unit != null && typeof d.unit !== 'string') throw new Error(`${p}.unit: expected a string`);
      if (d.description != null && typeof d.description !== 'string') throw new Error(`${p}.description: expected a string`);
      const v = d.value;
      let expression = null;
      if (typeof v === 'number') { if (!Number.isFinite(v)) throw new Error(`${p}.value: expected a finite number`); }
      else if (isExpression(v)) expression = v.slice(1);
      else throw new Error(`${p}.value: expected a number or an expression string starting with '='`);
      defs[name] = { value: v, unit: normalizeUnit(d.unit ?? null), description: d.description ?? null, expression, overridden: false };
    }
  }
  for (const [name, v] of Object.entries(overrides ?? {})) {
    if (!Object.hasOwn(defs, name)) throw new Error(`params override: unknown parameter '${name}'`);
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`params override ${name}: expected a finite number`);
    defs[name] = { ...defs[name], value: v, expression: null, overridden: true };
  }
  const values = Object.create(null);
  const state = Object.create(null);
  const unitMap = Object.fromEntries(Object.entries(defs).map(([k, d]) => [k, d.unit]));
  const asts = Object.create(null);
  for (const [name, d] of Object.entries(defs)) if (d.expression != null) {
    try { asts[name] = parseExpression(d.expression); } catch (e) { throw new Error(`params.${name}.value: ${e.message}`); }
  }
  const visit = (name, chain) => {
    if (state[name] === 2) return values[name];
    if (state[name] === 1) throw new Error(`params: circular reference ${[...chain, name].join(' -> ')}`);
    state[name] = 1;
    const d = defs[name];
    if (d.expression == null) values[name] = d.value;
    else {
      for (const ref of referencedNames(asts[name])) {
        if (!Object.hasOwn(defs, ref)) throw new Error(`params.${name}.value: unknown parameter '${ref}'`);
        visit(ref, [...chain, name]);
      }
      try { values[name] = evaluateAst(asts[name], values, d.expression); } catch (e) { throw new Error(`params.${name}.value: ${e.message}`); }
      checkUnit(asts[name], unitMap, d.unit, d.expression, `params.${name}.value`);
    }
    state[name] = 2;
    return values[name];
  };
  for (const name of Object.keys(defs)) visit(name, []);
  return { values: { ...values }, defs: { ...defs } };
}

/**
 * Replace every `=expr` string of a config subtree by its value. Returns a new tree (input untouched) and the list of
 * substitutions {path, expression, value, unitChecked}. Keys listed in `skip` (top level only) and `skipKeys` (any
 * depth) are copied verbatim (free text such as notes and sources is never an expression, audit A13).
 * Unit check (expressionUnit): an exact-unit expression (params, +- params, 1 * param, sums of those) must have the
 * key-suffix unit (for array elements the enclosing key); scaled params (possible conversions such as w_nm / 1000) and
 * products are not checked; exact terms in different units inside any sum are always an error.
 */
export function substituteExpressions(tree, values, units = {}, { skip = [], skipKeys = [] } = {}) {
  const substitutions = [];
  const visit = (v, path, key) => {
    if (isExpression(v)) {
      const src = v.slice(1);
      let ast;
      try { ast = parseExpression(src); } catch (e) { throw new Error(`${path}: ${e.message}`); }
      for (const ref of referencedNames(ast)) if (!Object.hasOwn(values, ref)) throw new Error(`${path}: expression "${src}" references unknown parameter '${ref}'`);
      let value;
      try { value = evaluateAst(ast, values, src); } catch (e) { throw new Error(`${path}: ${e.message}`); }
      const unitChecked = checkUnit(ast, units, unitOfKey(key), src, path);
      substitutions.push({ path, expression: src, value, unitChecked });
      return value;
    }
    if (Array.isArray(v)) return v.map((x, i) => visit(x, `${path}[${i}]`, key));
    if (v && typeof v === 'object') {
      const out = {};
      for (const [k, x] of Object.entries(v)) {
        if (k === '__proto__') throw new Error(`${path || 'config'}: reserved key __proto__`);
        out[k] = (path === '' && skip.includes(k)) || skipKeys.includes(k) ? x : visit(x, path ? `${path}.${k}` : k, k);
      }
      return out;
    }
    return v;
  };
  return { tree: visit(tree, '', null), substitutions };
}
