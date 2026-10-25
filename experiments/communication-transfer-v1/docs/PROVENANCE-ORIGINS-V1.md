# Citation origins — TRANSFER-01D v1

Each citation-like item carries text, claimed origin, identity, content hash and an exact UTF-16 span or null. Origin is one of ORIGINAL_SOURCE, SENDER_MESSAGE, HISTORICAL_CONTEXT, MODEL_INFERENCE or UNKNOWN_ORIGIN. Each origin has its own namespace and immutable text. A matching substring at the wrong origin is not sufficient.

Original-source validation checks source identity/hash plus exact span/text against the frozen source. Message validation checks the exact transmitted sender message, its own identity/hash and span. Historical-context validation requires the permitted item actually delivered, not a retained item excluded by consent/scope/expiry/conflict policy. Inference and unknown-origin text cannot become verbatim evidence through a hash or confident label. Missing or invalid spans stay unverified.

A valid message quote stays VERBATIM_AT_CLAIMED_ORIGIN_ONLY, even if it faithfully paraphrases the original. It is not silently relabelled as an original-source quote. A citation's provenance and a decision's semantic correctness are separate axes. Source authenticity, source truth and human acceptance are also separate.

The historical V3 receiver cited sender-message sentences that were not verbatim original-source passages. Its evaluator described the decisions as substantively supported while warning about literal citation quality. The new schema can record that distinction per question rather than collapsing it into one supported flag. New tests deliberately change origin, hash, identity or span and refuse the false binding.

For PLAIN, B receives no original-source anchors, only the sender message and new questions. LINKED adds validated source quotations, preservation requirements and explicit uncertainty. CONTEXT adds only admitted synthetic history under the existing versioned 01B policy; source obligations remain binding and unrelated history cannot override them. The inheritance of that policy's purpose namespace is explicit, not consent from a real user.

The scripted offline sender selects all N-4 source paragraphs as anchors. Thus enhanced offline packets carry all source text through excerpts, while PLAIN carries a paraphrase. This information difference and metadata overhead are reported; no benefit can be attributed solely to structural encoding or historical context. A hash-only unavailable link never counts as delivered source information. SOURCE itself is not executed in this three-arm smoke and remains separately defined in historical protocols.
