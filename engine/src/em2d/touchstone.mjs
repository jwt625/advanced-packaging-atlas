// Touchstone writer (version 2.0 keywords; also readable as 1.x for <= 4 ports with per-row line breaks) and reader
// (1.x option-line files and 2.0 keyword files). License: GPL-3.0-or-later.
//
// Writer layout: comment lines '!', [Version] 2.0, option line '# GHz S RI R <z0>', [Number of Ports], for 2-port
// [Two-Port Data Order] 21_12 (the 1.x order S11 S21 S12 S22), [Number of Frequencies], [Reference] when the port
// references differ, [Network Data], one block per frequency (frequency then the matrix row by row, at most 4 complex
// values per line), [End]. Format RI (real, imaginary) so no precision is lost to dB/angle conversion.

import { CMat } from './dense.mjs';

const fmt = (v) => (Number.isFinite(v) ? v.toExponential(12) : 'NaN');

/**
 * @param {{freqsHz:number[], S:CMat[], zref:number|number[], comments?:string[]}} net
 * @returns {string}
 */
export function writeTouchstone({ freqsHz, S, zref, comments = [] }) {
  if (!freqsHz.length || freqsHz.length !== S.length) throw new Error('touchstone: freqsHz and S must have the same non-zero length');
  const n = S[0].r;
  const z = Array.isArray(zref) ? zref : new Array(n).fill(zref);
  const uniform = z.every((v) => v === z[0]);
  const lines = [];
  for (const c of comments) lines.push(`! ${c}`);
  lines.push('[Version] 2.0');
  lines.push(`# GHz S RI R ${z[0]}`);
  lines.push(`[Number of Ports] ${n}`);
  if (n === 2) lines.push('[Two-Port Data Order] 21_12');
  lines.push(`[Number of Frequencies] ${freqsHz.length}`);
  if (!uniform) lines.push(`[Reference] ${z.join(' ')}`);
  lines.push('[Network Data]');
  freqsHz.forEach((f, k) => {
    const M = S[k];
    const fg = fmt(f / 1e9);
    if (n === 2) {
      const v = [M.re[0], M.im[0], M.re[2], M.im[2], M.re[1], M.im[1], M.re[3], M.im[3]];
      lines.push(`${fg} ${v.map(fmt).join(' ')}`);
      return;
    }
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) row.push(`${fmt(M.re[i * n + j])} ${fmt(M.im[i * n + j])}`);
      for (let c = 0; c < row.length; c += 4) {
        const chunk = row.slice(c, c + 4).join(' ');
        lines.push(i === 0 && c === 0 ? `${fg} ${chunk}` : chunk);
      }
    }
  });
  lines.push('[End]');
  return lines.join('\n') + '\n';
}

/**
 * Parse Touchstone 1.x (needs nPorts, e.g. from the .sNp extension) or 2.0 text.
 * @returns {{freqsHz:number[], S:CMat[], zref:number[], nPorts:number, version:string, format:string, parameter:string}}
 */
export function readTouchstone(text, { nPorts = null } = {}) {
  let version = '1.0',
    n = nPorts,
    unit = 'GHZ',
    param = 'S',
    format = 'MA',
    r0 = 50,
    order = null,
    refs = null;
  const nums = [];
  let inData = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split('!')[0].trim();
    if (!line) continue;
    if (line.startsWith('[')) {
      const m = /^\[([^\]]+)\]\s*(.*)$/.exec(line);
      const key = m[1].toLowerCase(),
        val = m[2].trim();
      if (key === 'version') version = val;
      else if (key === 'number of ports') n = parseInt(val, 10);
      else if (key === 'two-port data order') order = val;
      else if (key === 'reference') refs = val.split(/\s+/).map(Number);
      else if (key === 'network data') inData = true;
      else if (key === 'end') inData = false;
      continue;
    }
    if (line.startsWith('#')) {
      const tok = line.slice(1).trim().toUpperCase().split(/\s+/);
      for (let i = 0; i < tok.length; i++) {
        const t = tok[i];
        if (['HZ', 'KHZ', 'MHZ', 'GHZ'].includes(t)) unit = t;
        else if (['S', 'Y', 'Z', 'H', 'G'].includes(t)) param = t;
        else if (['DB', 'MA', 'RI'].includes(t)) format = t;
        else if (t === 'R') r0 = Number(tok[++i]);
      }
      if (version === '1.0') inData = true;
      continue;
    }
    if (inData || version === '1.0') for (const s of line.split(/\s+/)) nums.push(Number(s));
  }
  if (!n) throw new Error('touchstone: number of ports unknown (pass nPorts for 1.x files)');
  const scale = { HZ: 1, KHZ: 1e3, MHZ: 1e6, GHZ: 1e9 }[unit];
  const per = 1 + 2 * n * n;
  if (nums.length % per !== 0) throw new Error(`touchstone: ${nums.length} numbers is not a multiple of ${per}`);
  const freqsHz = [],
    S = [];
  for (let k = 0; k < nums.length; k += per) {
    freqsHz.push(nums[k] * scale);
    const M = new CMat(n);
    for (let q = 0; q < n * n; q++) {
      const a = nums[k + 1 + 2 * q],
        b = nums[k + 2 + 2 * q];
      let re, im;
      if (format === 'RI') [re, im] = [a, b];
      else {
        const mag = format === 'DB' ? 10 ** (a / 20) : a;
        const ph = (b * Math.PI) / 180;
        [re, im] = [mag * Math.cos(ph), mag * Math.sin(ph)];
      }
      let idx = q;
      if (n === 2 && order !== '12_21') idx = [0, 2, 1, 3][q]; // 1.x and 21_12: S11 S21 S12 S22
      M.re[idx] = re;
      M.im[idx] = im;
    }
    S.push(M);
  }
  return { freqsHz, S, zref: refs ?? new Array(n).fill(r0), nPorts: n, version, format, parameter: param };
}
