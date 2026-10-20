// package3d.json contract v1 (DevLog-008). Geometry convention used by the viewer:
// - x_mm / y_mm of parts and array regions are the CENTER of the footprint; w_mm along x, d_mm along y.
// - z_um is the BOTTOM of a part / layer; h_um its thickness. z grows upward from the package bottom.
// - insets.box_mm = [x0, y0, x1, y1] (footprint corners).

export type DimStatus = 'reported' | 'derived' | 'template';

export interface Dim {
	status: DimStatus;
	ref?: string;
	refs?: string[];
	note?: string;
	formula?: string;
	[k: string]: unknown;
}

export interface Ref {
	paper_id?: string;
	doi?: string;
	title?: string;
	year?: number;
	table?: string;
	row_id?: string;
	field?: string;
	locator?: string;
	basis?: string;
	url?: string;
	note?: string;
	[k: string]: unknown;
}

export interface Part {
	id: string;
	name: string;
	kind: string;
	material: string;
	x_mm: number;
	y_mm: number;
	w_mm: number;
	d_mm: number;
	z_um: number;
	h_um: number;
	explode_group?: number;
	xray_default?: boolean;
	dims?: Record<string, Dim>;
	note?: string;
	material_label?: string;
	template_id?: string;
	in?: string; // host part id for an embedded solid (e.g. a bridge inside the substrate)
}

export interface Layer {
	id: string;
	part: string;
	seq?: number;
	name?: string;
	material: string;
	role?: string;
	z_um: number;
	h_um: number;
	line_um?: number | null;
	space_um?: number | null;
	dims?: Record<string, Dim>;
	material_label?: string;
	template_id?: string;
	instances?: string[]; // host instance ids when the host part is repeated (the layer is drawn in each)
}

export interface Region {
	x_mm: number;
	y_mm: number;
	w_mm: number;
	d_mm: number;
}

export interface IcArray {
	id: string;
	name?: string;
	kind: string;
	between: string[];
	region: Region;
	pitch_um: number;
	diameter_um: number;
	height_um: number;
	z_um?: number;
	h_um?: number;
	mount?: string;
	material?: string;
	dims?: Record<string, Dim>;
	note?: string;
	template_id?: string;
}

export interface Callout {
	target: string;
	text: string;
	refs?: string[];
	note?: string; // longer text, shown in the click tooltip only
}

export interface InsetCamera {
	view?: string; // front | back | right | left | top | bottom | iso
	target?: [number, number, number]; // x_mm, y_mm, z_um
	span_mm?: number; // horizontal extent of the view
	[k: string]: unknown;
}

export interface Inset {
	id: string;
	label: string;
	box_mm: [number, number, number, number];
	z_um?: [number, number];
	camera?: InsetCamera;
	[k: string]: unknown;
}

export interface Family {
	id: string;
	name: string;
	company: string;
	package_class?: string;
	summary?: string;
	source_tvs?: string[];
	completeness?: { reported: number; derived: number; template: number };
	parts: Part[];
	layers?: Layer[];
	arrays?: IcArray[];
	callouts?: Callout[];
	insets?: Inset[];
	fixture?: boolean;
	note?: string;
}

export interface Package3D {
	version: number;
	generated?: string;
	fixture?: boolean;
	note?: string;
	refs: Record<string, Ref>;
	families: Family[];
}
