// Ported from eo-modulator-atlas app/src/lib/sim/colorbar.ts at eb97f96 (GPL-3.0-or-later).
// Local changes: ScaleMode imported from fieldmath.ts (no EO types.ts).
// Color legend drawing (one per color-table feature), shared by the graphics overlay and the image export.
import { colormapLut, type ColormapName } from './colormap';
import { linearTicks, logTicks, tickLabel } from './ticks';
import { scaleT, type Range, type ScaleMode } from './fieldmath';

export interface LegendSpec {
	title: string;
	unit: string;
	range: Range;
	scale: ScaleMode;
	table: ColormapName;
	reverse: boolean;
	/** Extra tooltip text (range rule, clamped values, signed range). */
	note?: string;
}

export const LEGEND_W = 78;

/** Draw a vertical legend with its top-left corner at (x, y), size w x h (CSS px of `ctx`). */
export function drawLegend(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s: LegendSpec, dark: boolean) {
	ctx.save();
	ctx.fillStyle = dark ? 'rgba(26,26,25,0.85)' : 'rgba(252,252,251,0.88)';
	ctx.fillRect(x, y, w, h);
	ctx.strokeStyle = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
	ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
	const lut = colormapLut(s.table, s.reverse);
	const top = y + 32, bot = y + h - 8, bx = x + 6, bw = 12;
	for (let py = top; py < bot; py++) {
		const t = 1 - (py - top) / (bot - top - 1);
		const i = Math.max(0, Math.min(255, Math.round(t * 255)));
		ctx.fillStyle = `rgb(${lut[4 * i]},${lut[4 * i + 1]},${lut[4 * i + 2]})`;
		ctx.fillRect(bx, py, bw, 1);
	}
	ctx.fillStyle = dark ? '#f2f1ec' : '#0b0b0b';
	ctx.font = '10px system-ui, sans-serif';
	ctx.textAlign = 'left';
	const fit = (txt: string, max: number) => {
		if (ctx.measureText(txt).width <= max) return txt;
		let t = txt;
		while (t.length > 1 && ctx.measureText(`${t}...`).width > max) t = t.slice(0, -1);
		return `${t}...`;
	};
	const label = s.scale === 'log' ? `|${s.title}|` : s.title;
	ctx.fillText(fit(label, w - 8), x + 4, y + 12);
	ctx.fillText(fit(`(${s.unit})${s.scale === 'log' ? ' log' : s.scale === 'symlog' ? ' signed log' : ''}`, w - 8), x + 4, y + 24);
	const { min, max } = s.range;
	// symlog: decades of |v| mirrored about the centre (|v| < min); fewer per side so the labels fit
	// (decades too close to the centre are dropped so the +- labels do not collide)
	const sym = s.scale === 'symlog' ? logTicks(min, max).filter((t) => Math.abs(Math.log10(t) - Math.round(Math.log10(t))) < 1e-9 && scaleT(t, 'symlog', s.range) >= 0.58) : [];
	const symTicks = sym.length > 4 ? sym.filter((_, i) => i % Math.ceil(sym.length / 3) === 0 || i === sym.length - 1) : sym;
	const ticks = s.scale === 'log' ? logTicks(min, max) : s.scale === 'symlog' ? [...symTicks.map((t) => -t).reverse(), ...symTicks] : linearTicks(min, max, 5);
	for (const t of ticks) {
		const u = s.scale === 'log' ? (Math.log10(t) - Math.log10(min)) / (Math.log10(max) - Math.log10(min)) : s.scale === 'symlog' ? scaleT(t, 'symlog', s.range) : (t - min) / (max - min);
		if (!(u >= -1e-9 && u <= 1 + 1e-9)) continue;
		const py = Math.round(bot - u * (bot - top - 1)) + 0.5;
		ctx.fillRect(bx + bw, py, 3, 1);
		ctx.fillText(tickLabel(t), bx + bw + 5, py + 3);
	}
	ctx.restore();
}

export function legendTip(s: LegendSpec): string {
	const scale = s.scale === 'symlog' ? 'signed log' : s.scale;
	const range = s.scale === 'symlog' ? `|value| range ${tickLabel(Number(s.range.min.toPrecision(4)))} to ${tickLabel(Number(s.range.max.toPrecision(4)))}` : `range ${tickLabel(Number(s.range.min.toPrecision(4)))} to ${tickLabel(Number(s.range.max.toPrecision(4)))}`;
	return `${s.title} (${s.unit}), ${scale} scale, ${range}, ${s.table}${s.reverse ? ' reversed' : ''}${s.note ? `. ${s.note}` : ''}`;
}
