// Anchoring: a defence against keyword-stuffing.
//
// A pattern obligation ("the output matches /idempotent/ and /exempt/") is met by a bag of words. An
// anchored obligation names a short key phrase from the source and requires its ADJACENT word pairs to
// survive, in order, inside one sentence or line of the output. A bag of words has no adjacent pairs to
// offer. This defeats bag-of-words stuffing and nothing more: a producer that copies the exact phrase in
// order has kept the phrase, which is what the obligation asks, and the check cannot say whether the
// sentence around it still means the same thing.

/** Split into segments and the separators between them, so a segment can be replaced without disturbing the rest. */
export function splitKeepingSeparators(text: string): string[] {
	return text.split(/(\n+|(?<=[.!?])[ \t]+)/);
}

/** The segments only: sentences and lines. */
export function segmentsOf(text: string): string[] {
	return splitKeepingSeparators(text).filter((_, i) => i % 2 === 0);
}

const wordsOf = (text: string): string[] => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

function bigrams(words: readonly string[]): Set<string> {
	const out = new Set<string>();
	for (let i = 0; i + 1 < words.length; i++) out.add(words[i] + " " + words[i + 1]);
	return out;
}

/** Share of the passage's adjacent word pairs found in a single segment of the output (best segment). 0 to 1. */
export function anchorOverlap(passage: string, output: string): number {
	return bestAnchorSegment(passage, output).overlap;
}

/** The segment of the output that best carries the passage, with its index among the segments and its overlap. */
export function bestAnchorSegment(passage: string, output: string): { index: number; overlap: number } {
	const pw = wordsOf(passage);
	const segs = segmentsOf(output);
	let best = { index: -1, overlap: 0 };
	// A single-word passage has no order to preserve: it counts as present or absent.
	if (pw.length < 2) {
		segs.forEach((s, i) => {
			if (best.overlap === 0 && wordsOf(s).includes(pw[0] ?? "")) best = { index: i, overlap: 1 };
		});
		return best;
	}
	const pb = bigrams(pw);
	segs.forEach((s, i) => {
		const sb = bigrams(wordsOf(s));
		let n = 0;
		for (const b of pb) if (sb.has(b)) n++;
		const overlap = n / pb.size;
		if (overlap > best.overlap) best = { index: i, overlap };
	});
	return best;
}

/** What a stuffer does to a sentence: keep every word, destroy the order and the punctuation. */
export function stuffTokens(segment: string): string {
	return [...new Set(wordsOf(segment))].sort().join(" ");
}
