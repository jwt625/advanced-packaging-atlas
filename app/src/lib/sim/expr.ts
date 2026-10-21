// Ported from eo-modulator-atlas engine/src/params.mjs at eb97f96 (GPL-3.0-or-later).
// Local changes: TypeScript; only the expression parser and evaluator (parseExpression, referencedNames, evaluateAst,
// evaluateExpression, isExpression); key-suffix unit checks and resolveParams stay in the engine (L1 src/params/).
// Own recursive-descent parser: numbers, parameter names, + - * / ^, parentheses, unary minus, min max sqrt abs sin cos
// tan and pi. No eval, no Function, no property access. `^` is right associative and binds tighter than unary minus.

export type Ast =
	| { k: 'num'; v: number; name?: string }
	| { k: 'ref'; name: string }
	| { k: 'neg'; a: Ast }
	| { k: 'bin'; op: string; a: Ast; b: Ast }
	| { k: 'call'; name: string; args: Ast[] };
interface Tok { t: string; v?: number | string; pos: number }

export const EXPRESSION_PREFIX = '=';
export const MAX_EXPRESSION_LENGTH = 500;
export const MAX_PARAMS = 500;
const MAX_DEPTH = 64;
const FUNCTIONS: Record<string, { arity: [number, number]; f: (...a: number[]) => number }> = {
  min: { arity: [1, Infinity], f: (...a) => Math.min(...a) },
  max: { arity: [1, Infinity], f: (...a) => Math.max(...a) },
  sqrt: { arity: [1, 1], f: Math.sqrt },
  abs: { arity: [1, 1], f: Math.abs },
  sin: { arity: [1, 1], f: Math.sin },
  cos: { arity: [1, 1], f: Math.cos },
  tan: { arity: [1, 1], f: Math.tan },
};
const CONSTANTS: Record<string, number> = { pi: Math.PI };
const RESERVED = new Set([...Object.keys(FUNCTIONS), ...Object.keys(CONSTANTS)]);
export const PARAM_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

export class ExprError extends Error {}
const err = (expr: string, pos: number | null, msg: string): never => { throw new ExprError(`expression "${expr}": ${msg}${pos == null ? '' : ` at position ${pos + 1}`}`); };

function tokenize(src: string): Tok[] {
  const tokens: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if ((c >= '0' && c <= '9') || (c === '.' && src[i + 1] >= '0' && src[i + 1] <= '9')) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i))!;
      tokens.push({ t: 'num', v: Number(m[0]), pos: i });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
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
export function parseExpression(src: string): Ast {
  if (typeof src !== 'string') throw new ExprError('expression must be a string');
  if (src.length > MAX_EXPRESSION_LENGTH) throw new ExprError(`expression longer than ${MAX_EXPRESSION_LENGTH} characters`);
  const toks = tokenize(src);
  let p = 0;
  let depth = 0;
  const peek = () => toks[p];
  const take = (t: string) => {
    if (toks[p].t !== t) err(src, toks[p].pos, `expected '${t}'${toks[p].t === 'end' ? ' before the end' : ''}`);
    return toks[p++];
  };
  const enter = () => { if (++depth > MAX_DEPTH) err(src, toks[p].pos, 'nesting too deep'); };
  // expr := term (('+'|'-') term)*
  function expr(): Ast {
    enter();
    let a = term();
    while (peek().t === '+' || peek().t === '-') { const op = toks[p++].t; a = { k: 'bin', op, a, b: term() }; }
    depth--;
    return a;
  }
  // term := unary (('*'|'/') unary)*
  function term(): Ast {
    let a = unary();
    while (peek().t === '*' || peek().t === '/') { const op = toks[p++].t; a = { k: 'bin', op, a, b: unary() }; }
    return a;
  }
  // unary := '-' unary | '+' unary | power
  function unary(): Ast {
    if (peek().t === '-') { p++; enter(); const a = unary(); depth--; return { k: 'neg', a }; }
    if (peek().t === '+') { p++; enter(); const a = unary(); depth--; return a; }
    return power();
  }
  // power := primary ('^' unary)?   (right associative; the exponent may carry a sign)
  function power(): Ast {
    const a = primary();
    if (peek().t === '^') { p++; enter(); const b = unary(); depth--; return { k: 'bin', op: '^', a, b }; }
    return a;
  }
  function primary(): Ast {
    const tk = peek();
    if (tk.t === 'num') { p++; return { k: 'num', v: tk.v as number }; }
    if (tk.t === '(') { p++; const a = expr(); take(')'); return a; }
    if (tk.t === 'name') {
      const name = tk.v as string;
      p++;
      if (peek().t === '(') {
        if (!Object.hasOwn(FUNCTIONS, name)) err(src, tk.pos, `unknown function '${name}' (allowed: ${Object.keys(FUNCTIONS).join(', ')})`);
        p++;
        const args: Ast[] = [];
        if (peek().t !== ')') { args.push(expr()); while (peek().t === ',') { p++; args.push(expr()); } }
        take(')');
        const [lo, hi] = FUNCTIONS[name].arity;
        if (args.length < lo || args.length > hi) err(src, tk.pos, `${name} takes ${lo === hi ? lo : `at least ${lo}`} argument${lo === 1 && hi === 1 ? '' : 's'}`);
        return { k: 'call', name: name, args };
      }
      if (Object.hasOwn(FUNCTIONS, name)) err(src, tk.pos, `function '${name}' needs parentheses`);
      if (Object.hasOwn(CONSTANTS, name)) return { k: 'num', v: CONSTANTS[name], name: name };
      return { k: 'ref', name: name };
    }
    return err(src, tk.pos, tk.t === 'end' ? 'unexpected end of expression' : `unexpected '${tk.t}'`);
  }
  const ast = expr();
  if (peek().t !== 'end') err(src, peek().pos, `unexpected '${peek().t}'`);
  return ast;
}

/** Parameter names referenced by an AST (sorted, unique). */
export function referencedNames(ast: Ast): string[] {
  const out = new Set<string>();
  const walk = (n: Ast): void => {
    if (n.k === 'ref') out.add(n.name);
    else if (n.k === 'neg') walk(n.a);
    else if (n.k === 'bin') { walk(n.a); walk(n.b); }
    else if (n.k === 'call') n.args.forEach(walk);
  };
  walk(ast);
  return [...out].sort();
}

/** Evaluate an AST with parameter values; a non-finite result is an error. */
export function evaluateAst(ast: Ast, values: Record<string, number>, src = ''): number {
  const ev = (n: Ast): number => {
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
export function evaluateExpression(src: string, values: Record<string, number> = {}): number {
  return evaluateAst(parseExpression(src), values, src);
}

export const isExpression = (v: unknown): v is string => typeof v === 'string' && v.startsWith(EXPRESSION_PREFIX);

