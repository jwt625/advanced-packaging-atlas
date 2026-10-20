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
	route?: Route; // routed conductor level (DevLog-011): matrix dielectric + synthesized Cu features in the routing window
}

/** Routing pattern of a conductor layer (DevLog-011 contract). Lengths in um. */
export interface Route {
	use: 'signal' | 'plane' | 'pad' | 'mixed' | string;
	dir?: 'x' | 'y' | string; // signal / mixed only (resolved; absent on plane / pad)
	line_um?: number;
	space_um?: number; // plane: antipad clearance
	matrix: string; // material key of the dielectric around the Cu
	fill: number; // Cu area fraction
	dims?: Record<string, Dim>;
	[k: string]: unknown;
}

/** One via entry (per spanned dielectric / part level). Lengths in um. */
export interface ViaClass {
	id: string;
	template_id?: string;
	name?: string;
	kind: string; // microvia | rdl_via | beol_via | pth | tsv | tgv | tdv | bridge_via | tmv
	part: string; // host template id
	through: string;
	through_kind?: 'layer' | 'group' | 'part' | string;
	instances?: string[]; // host instance ids (xy-repeated host)
	z_um: number;
	h_um: number;
	upper?: string | null; // conductor layer id above the span (null at a host face)
	lower?: string | null;
	diameter_um: number; // top diameter
	bottom_diameter_um?: number;
	land_um?: number;
	pitch_um?: number; // grid vias only
	fill?: 'filled' | 'conformal' | 'plugged' | string;
	wall_um?: number;
	liner_um?: number;
	plug?: 'resin' | 'copper' | 'none' | string; // core of a plugged / conformal via
	regions?: Region[]; // restrict the class to these footprints (package frame, centers like array regions)
	cluster?: { n: number; pitch_um: number; dims?: Record<string, Dim> }; // n vias on a compact grid per site
	note?: string;
	dims?: Record<string, Dim>;
	[k: string]: unknown;
}

export interface Net {
	id: string;
	kind: 'vertical' | 'lateral' | 'plane_tie' | 'escape' | string;
	from: string; // array id or template id
	to?: string;
	style?: 'stacked' | 'staggered' | string;
	jog?: string[]; // concrete layer ids
	levels?: string[];
	plane?: string;
	share: number;
	length_um?: number;
	note?: string;
	dims?: Record<string, Dim>;
	[k: string]: unknown;
}

export interface Routing {
	layout_note: string;
	vias: ViaClass[];
	nets: Net[];
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
	pad_um?: number; // optional landing pad diameter on the routed level it touches (viewer default from diameter_um)
	opening_um?: number; // optional solder-resist / passivation opening diameter
	cap_h_um?: number; // solder cap height at the lower end (Cu column + solder cap); absent = one material
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
	routing?: Routing;
}

export interface Package3D {
	version: number;
	generated?: string;
	fixture?: boolean;
	note?: string;
	refs: Record<string, Ref>;
	families: Family[];
}
