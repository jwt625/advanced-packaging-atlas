// License: GPL-3.0-or-later.
// Expression grammar of the package3d templates (config/package3d/TEMPLATE_FORMAT.md): + - * / **, parentheses,
// min, max, floor, ceil, numeric literals, identifiers. Python semantics: ** binds tighter than unary minus and is
// right-associative. Pure functions, no eval().

const FUNCS = {
  min: (...a) => Math.min(...a),
  max: (...a) => Math.max(...a),
  floor: (a) => Math.floor(a),
  ceil: (a) => Math.ceil(a),
};

export class ExprError extends Error {}

export function tokenize(src) {
  const s = String(src);
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(s.slice(i));
      if (!m) throw new ExprError(`bad number at ${i} in ${JSON.stringify(s)}`);
      out.push({ t: 'num', v: Number(m[0]), s: m[0] });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i));
      out.push({ t: 'id', v: m[0], s: m[0] });
      i += m[0].length;
      continue;
    }
    if (s.startsWith('**', i)) { out.push({ t: 'op', v: '**', s: '**' }); i += 2; continue; }
    if ('+-*/(),'.includes(c)) { out.push({ t: 'op', v: c, s: c }); i++; continue; }
    throw new ExprError(`unexpected ${JSON.stringify(c)} in ${JSON.stringify(s)}`);
  }
  return out;
}

export function parse(src) {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const take = (v) => {
    const t = toks[p];
    if (!t || (v !== undefined && t.v !== v)) throw new ExprError(`expected ${v ?? 'token'} in ${JSON.stringify(src)}`);
    p++;
    return t;
  };
  function expr() {
    let n = term();
    while (peek() && (peek().v === '+' || peek().v === '-') && peek().t === 'op') {
      const op = take().v;
      n = { k: 'bin', op, a: n, b: term() };
    }
    return n;
  }
  function term() {
    let n = unary();
    while (peek() && (peek().v === '*' || peek().v === '/') && peek().t === 'op') {
      const op = take().v;
      n = { k: 'bin', op, a: n, b: unary() };
    }
    return n;
  }
  function unary() {
    if (peek() && peek().t === 'op' && (peek().v === '-' || peek().v === '+')) {
      const op = take().v;
      const a = unary();
      return op === '-' ? { k: 'neg', a } : a;
    }
    return power();
  }
  function power() {
    const base = atom();
    if (peek() && peek().v === '**') {
      take();
      return { k: 'bin', op: '**', a: base, b: unary() };
    }
    return base;
  }
  function atom() {
    const t = peek();
    if (!t) throw new ExprError(`unexpected end of ${JSON.stringify(src)}`);
    if (t.t === 'num') { p++; return { k: 'num', v: t.v }; }
    if (t.t === 'id') {
      p++;
      if (peek() && peek().v === '(') {
        if (!(t.v in FUNCS)) throw new ExprError(`unknown function ${t.v} in ${JSON.stringify(src)}`);
        take('(');
        const args = [expr()];
        while (peek() && peek().v === ',') { take(','); args.push(expr()); }
        take(')');
        return { k: 'call', f: t.v, args };
      }
      return { k: 'id', v: t.v };
    }
    if (t.v === '(') { take('('); const n = expr(); take(')'); return n; }
    throw new ExprError(`unexpected ${t.s} in ${JSON.stringify(src)}`);
  }
  const n = expr();
  if (p !== toks.length) throw new ExprError(`trailing tokens in ${JSON.stringify(src)}`);
  return n;
}

export function evaluate(ast, lookup) {
  switch (ast.k) {
    case 'num': return ast.v;
    case 'id': {
      const v = lookup(ast.v);
      if (typeof v !== 'number' || Number.isNaN(v)) throw new ExprError(`identifier ${ast.v} is not a number (${v})`);
      return v;
    }
    case 'neg': return -evaluate(ast.a, lookup);
    case 'call': return FUNCS[ast.f](...ast.args.map((a) => evaluate(a, lookup)));
    case 'bin': {
      const a = evaluate(ast.a, lookup);
      const b = evaluate(ast.b, lookup);
      switch (ast.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        case '**': return a ** b;
        default: throw new ExprError(`bad op ${ast.op}`);
      }
    }
    default: throw new ExprError(`bad node ${ast.k}`);
  }
}

/** Identifiers referenced by an expression (function names excluded), in first-use order. */
export function identifiers(src) {
  const seen = [];
  const walk = (n) => {
    if (n.k === 'id' && !seen.includes(n.v)) seen.push(n.v);
    if (n.a) walk(n.a);
    if (n.b) walk(n.b);
    if (n.args) n.args.forEach(walk);
  };
  walk(parse(src));
  return seen;
}

export function evalExpr(src, lookup) {
  return evaluate(parse(src), lookup);
}

/**
 * Recover r0, r1, ... from a JSON `formula` and its `values` string (the builder substitutes every identifier by its
 * number, see scripts/build_package3d.py). Returns {r0: n, ...}. Throws when the strings do not align.
 */
export function rValues(formula, values) {
  const f = tokenize(formula);
  const v = tokenize(values);
  const out = {};
  let j = 0;
  for (let i = 0; i < f.length; i++) {
    const ft = f[i];
    if (j >= v.length) throw new ExprError(`values ${JSON.stringify(values)} shorter than ${JSON.stringify(formula)}`);
    if (ft.t === 'id' && !(ft.v in FUNCS && f[i + 1] && f[i + 1].v === '(')) {
      let sign = 1;
      if (v[j].t === 'op' && v[j].v === '-' && v[j + 1] && v[j + 1].t === 'num') { sign = -1; j++; }
      if (v[j].t !== 'num') throw new ExprError(`cannot align ${ft.v} in ${JSON.stringify(formula)} / ${JSON.stringify(values)}`);
      if (/^r\d+$/.test(ft.v)) out[ft.v] = sign * v[j].v;
      j++;
      continue;
    }
    if (ft.s !== v[j].s && !(ft.t === 'num' && v[j].t === 'num' && ft.v === v[j].v)) {
      throw new ExprError(`cannot align ${ft.s} vs ${v[j].s} in ${JSON.stringify(formula)} / ${JSON.stringify(values)}`);
    }
    j++;
  }
  return out;
}
