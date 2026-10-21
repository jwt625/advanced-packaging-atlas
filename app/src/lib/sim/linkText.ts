// Case text in a link (U4): deflate-raw (CompressionStream) + base64url, for in-memory cases (pick channel drafts,
// default studies, YAML-tab edits). Links stay short: callers check the encoded length against LINK_TEXT_MAX.
export const LINK_TEXT_MAX = 6000;

const b64url = (bytes: Uint8Array) => {
	let s = '';
	for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64url = (s: string) => {
	const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
	return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
	const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
	return new Uint8Array(await out.arrayBuffer());
}

export async function packText(text: string): Promise<string> {
	return b64url(await pipe(new TextEncoder().encode(text), new CompressionStream('deflate-raw')));
}

export async function unpackText(packed: string): Promise<string> {
	return new TextDecoder().decode(await pipe(unb64url(packed), new DecompressionStream('deflate-raw')));
}
