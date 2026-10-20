export type Qual = 'lt' | 'gt' | 'ge' | 'le' | 'approx';

/** One row of a child table (components, stack_layers, ...); keys follow data/schema/packaging.schema.yaml. */
export interface Row {
	[x: string]: unknown;
	quals?: Record<string, Qual>;
	overrides?: { field: string; value: string }[];
}

export interface EvidenceMeta {
	verified_on: string;
	figure_reading_method: string;
	notes: string;
	n_entries: number;
	entries: { table?: string; row_id?: string; field?: string; basis?: string; locator?: string; note?: string }[];
	derived: unknown[];
	conflicts: { table?: string; row_id?: string; field?: string; values?: unknown[]; locators?: string[]; chosen?: unknown; why?: string }[];
	excluded: string[];
	not_reported: string[];
}

/** One process flow of a paper (process_flows.csv, schema v2.4); its steps are projected onto each TV in tv_ids. */
export interface ProcessFlow {
	flow_id: string;
	flow_name?: string;
	/** tv_build | generic_platform | comparison */
	scope: string;
	/** full | ordered | fragments */
	level: string;
	tv_ids: string[];
	/** order of this flow in its TVs' build, 1 = first (schema v2.5; defaults to the flow number) */
	build_seq?: number;
	/** shared steps (all tv_ids) and TV-specific delta steps (a delta may list several TVs) */
	n_steps: number;
	n_deltas: number;
	basis?: string;
	source?: string;
	locator?: string;
	notes?: string;
}

export interface Paper {
	paper_id: string;
	label: string;
	first_author: string;
	title: string;
	year: number;
	venue: string;
	doi: string;
	url: string;
	primary_bucket: string;
	buckets: string[];
	technology_name: string;
	source_status: string;
	pages_read: string;
	n_test_vehicles: number;
	/** full | ordered | fragments | none (schema v2.4) */
	process_flow_level?: string;
	/** derived: yes iff process_flow_level is full or ordered */
	has_process_flow?: string;
	verified_on: string;
	/** affiliations as printed (provenance; papers.csv) */
	orgs: string[];
	/** distinct canonical org names (organizations.csv) in byline order, first author's first */
	orgs_canonical: string[];
	/** printed author x affiliation with a placed site: a = author index (1-based), n = author, s = site id, k = kind */
	affil: { a: number; n: string; s: number; k: string }[];
	notes: string;
	n_tvs: number;
	tables_present: string[];
	process_flows?: ProcessFlow[];
	evidence?: EvidenceMeta;
}

export interface TvRows {
	components: Row[];
	stack_layers: Row[];
	interconnects: Row[];
	process_steps: Row[];
	electrical_interfaces: Row[];
	optical_interfaces: Row[];
	metrics: Row[];
}

export interface HeadlineMeta {
	basis?: string;
	locator?: string;
	note?: string;
	row_id?: string;
}

export interface Headline {
	[key: string]: number | string | undefined;
}

export interface TestVehicle {
	tv_id: string;
	paper_id: string;
	name: string;
	tv_kind: string;
	package_class: string;
	technology_name: string;
	purpose: string;
	carrier_format: string;
	carrier_size_mm: string;
	package_x_mm?: number;
	package_y_mm?: number;
	package_thickness_mm?: number;
	interposer_x_mm?: number;
	interposer_y_mm?: number;
	interposer_area_mm2?: number;
	reticle_multiple?: number;
	substrate_x_mm?: number;
	substrate_y_mm?: number;
	substrate_layer_count: string;
	n_dies?: number;
	n_hbm?: number;
	basis: string;
	source: string;
	locator: string;
	quals?: Record<string, Qual>;
	overrides?: { field: string; value: string }[];
	notes: string;
	headline: Headline;
	headline_meta: Record<string, HeadlineMeta>;
	n_rows: number;
	rows: TvRows;
}

/** Institution site (org_sites.csv) with coordinates; unresolved sites are not emitted. */
export interface Site {
	id: number;
	org: string;
	locality: string;
	country: string;
	lat: number;
	lon: number;
	/** building | campus | postcode | city | region */
	precision: string;
	source: string;
	source_ref: string;
}

export interface ColumnMeta {
	name: string;
	label: string;
	type: string;
	enum?: string;
	required?: boolean;
}

export interface Atlas {
	meta: {
		generated_on: string;
		schema_version: number;
		title: string;
		table_titles: Record<string, string>;
		child_tables: string[];
		basis_definition: string;
		headline_definition: string;
	};
	integrity: {
		counts: Record<string, number>;
		per_bucket: Record<string, number>;
		per_tv_kind: Record<string, number>;
		per_package_class: Record<string, number>;
		per_year: Record<string, number>;
		per_source_status: Record<string, number>;
		per_basis: Record<string, number>;
		per_source: Record<string, number>;
		per_ic_type: Record<string, number>;
		per_step_category: Record<string, number>;
		per_process_flow_level?: Record<string, number>;
		per_metric_category: Record<string, number>;
		per_material_class: Record<string, number>;
		per_structure: Record<string, number>;
		per_bonding_method: Record<string, number>;
		per_interconnect_level: Record<string, number>;
		per_organization: Record<string, number>;
		tables_present: Record<string, number>;
	};
	enums: Record<string, { value: string; label: string }[]>;
	columns: Record<string, ColumnMeta[]>;
	papers: Paper[];
	tvs: TestVehicle[];
	sites?: Site[];
	/** variant org name -> canonical org_name (config/org_aliases.yaml) */
	org_aliases?: Record<string, string>;
}

export interface Filters {
	q: string;
	buckets: string[];
	packageClasses: string[];
	tvKinds: string[];
	sourceStatuses: string[];
	orgs: string[];
	yearMin: number | null;
	yearMax: number | null;
	hasHybrid: boolean;
	hasVia: boolean;
	hasOptical: boolean;
	hasElectrical: boolean;
	measuredOnly: boolean;
}

export interface SortKey {
	key: string;
	dir: 'asc' | 'desc';
}
