// Ported from eo-modulator-atlas app/src/lib/sim/exportUtil.ts at eb97f96 (GPL-3.0-or-later).
// CSV and file download helpers (browser only).

const cell = (v: unknown) => {
	const s = v == null ? '' : typeof v === 'number' ? (Number.isFinite(v) ? String(v) : '') : String(v);
	return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export function toCsv(header: string[], rows: unknown[][]): string {
	return [header, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n';
}

export function downloadDataUrl(name: string, url: string): void {
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	a.remove();
}

export function downloadText(name: string, text: string, type = 'text/csv'): void {
	const url = URL.createObjectURL(new Blob([text], { type }));
	downloadDataUrl(name, url);
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
