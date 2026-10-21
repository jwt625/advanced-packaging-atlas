// Minimal WebAssembly module encoder (lane L1 wave 3, gate G1; DevLog-010 A9, EO DevLog-024 S3.10 approach): module
// bytes are assembled in JS at run time, so the engine needs no toolchain and no binary assets. Covers what the
// solver kernels use: one imported memory, functions over i32 / f64 locals, structured control flow, f64 and v128
// (f64x2) memory ops. Binary format: WebAssembly Core Specification 2.0 (sections 5.1-5.5) and the fixed-width SIMD
// proposal opcodes (0xFD prefix).
// License: GPL-3.0-or-later.

export const I32 = 0x7f, F64 = 0x7c, V128 = 0x7b;

/** Unsigned LEB128. */
export function uleb(n) {
  const out = [];
  do {
    let b = n & 0x7f;
    n >>>= 7;
    if (n) b |= 0x80;
    out.push(b);
  } while (n);
  return out;
}

/** Signed LEB128 (32-bit range). */
export function sleb(n) {
  const out = [];
  for (;;) {
    const b = n & 0x7f;
    n >>= 7;
    if ((n === 0 && (b & 0x40) === 0) || (n === -1 && (b & 0x40) !== 0)) {
      out.push(b);
      return out;
    }
    out.push(b | 0x80);
  }
}

const str = (s) => [...uleb(s.length), ...[...s].map((c) => c.charCodeAt(0))];
const vec = (items) => [...uleb(items.length), ...items.flat()];
const section = (id, bytes) => [id, ...uleb(bytes.length), ...bytes];

/** Function body builder: locals and an instruction byte stream with named helpers. */
export class Fn {
  constructor(name, params, results = []) {
    this.name = name;
    this.params = params;
    this.results = results;
    this.locals = [];
    this.code = [];
  }
  /** New local of `type`; returns its index (params come first). */
  local(type) {
    this.locals.push(type);
    return this.params.length + this.locals.length - 1;
  }
  op(...b) {
    this.code.push(...b);
    return this;
  }
  get(i) { return this.op(0x20, ...uleb(i)); }
  set(i) { return this.op(0x21, ...uleb(i)); }
  tee(i) { return this.op(0x22, ...uleb(i)); }
  i32(v) { return this.op(0x41, ...sleb(v | 0)); }
  add() { return this.op(0x6a); }
  sub() { return this.op(0x6b); }
  mul() { return this.op(0x6c); }
  ltS() { return this.op(0x48); }
  geS() { return this.op(0x4e); }
  f64const(v) {
    const b = new Uint8Array(new Float64Array([v]).buffer);
    return this.op(0x44, ...b);
  }
  /** f64.load / f64.store with a byte offset immediate (align 2^3). */
  fload(off = 0) { return this.op(0x2b, 3, ...uleb(off)); }
  fstore(off = 0) { return this.op(0x39, 3, ...uleb(off)); }
  fadd() { return this.op(0xa0); }
  fsub() { return this.op(0xa1); }
  fmul() { return this.op(0xa2); }
  /** v128.load / v128.store (alignment hint 2^3: f64-aligned data). */
  vload(off = 0) { return this.op(0xfd, ...uleb(0), 3, ...uleb(off)); }
  vstore(off = 0) { return this.op(0xfd, ...uleb(11), 3, ...uleb(off)); }
  vsplat() { return this.op(0xfd, ...uleb(20)); }
  vextract(lane) { return this.op(0xfd, ...uleb(33), lane); }
  vadd() { return this.op(0xfd, ...uleb(240)); }
  vmul() { return this.op(0xfd, ...uleb(242)); }
  vzero() { return this.op(0xfd, ...uleb(12), ...new Array(16).fill(0)); }
  block() { return this.op(0x02, 0x40); }
  loop() { return this.op(0x03, 0x40); }
  end() { return this.op(0x0b); }
  br(d) { return this.op(0x0c, ...uleb(d)); }
  brIf(d) { return this.op(0x0d, ...uleb(d)); }
  /** Compiled body (locals grouped one entry per local, then code, end). */
  body() {
    const locals = vec(this.locals.map((t) => [1, t]));
    const b = [...locals, ...this.code, 0x0b];
    return [...uleb(b.length), ...b];
  }
}

/**
 * Module with one imported memory (env.memory) and the given functions, all exported by name.
 * @param {Fn[]} fns
 * @returns {Uint8Array}
 */
export function buildModule(fns) {
  const types = fns.map((f) => [0x60, ...vec(f.params.map((t) => [t])), ...vec(f.results.map((t) => [t]))]);
  const imports = vec([[...str('env'), ...str('memory'), 0x02, 0x00, ...uleb(0)]]);
  const funcs = vec(fns.map((_, i) => uleb(i)));
  const exps = vec(fns.map((f, i) => [...str(f.name), 0x00, ...uleb(i)]));
  const code = vec(fns.map((f) => f.body()));
  return Uint8Array.from([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    ...section(1, vec(types)), ...section(2, imports), ...section(3, funcs), ...section(7, exps), ...section(10, code),
  ]);
}

let simdOk = null;
/** Whether this runtime validates a module using f64x2 (fixed-width SIMD). */
export function simdSupported() {
  if (simdOk != null) return simdOk;
  try {
    const f = new Fn('t', [], [F64]);
    f.vzero().vextract(0);
    simdOk = typeof WebAssembly === 'object' && WebAssembly.validate(buildModule([f]));
  } catch {
    simdOk = false;
  }
  return simdOk;
}
