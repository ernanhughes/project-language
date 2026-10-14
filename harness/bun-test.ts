// A small compatibility shim so tests written for `bun:test` run under `node --test`.
//
// The lifted provider tests (evidence, verify, proof, work, remembering) were
// written against Bun. This maps the subset of the API they actually use onto
// node:test and node:assert. It is not a general Bun replacement: if a lifted
// test needs a matcher that is not here, the shim throws, and the fix is to add
// the matcher deliberately, not to loosen an existing one.
import { after, afterEach as nodeAfterEach, before, beforeEach as nodeBeforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";

export { describe };
type TestFn = (...a: never[]) => unknown;
export const test = Object.assign(
	(name: string, fn?: TestFn, _timeout?: number) => it(name, fn as never),
	{
		skip: it.skip,
		only: it.only,
		todo: it.todo,
		skipIf: (cond: unknown) => (name: string, fn?: TestFn, _timeout?: number) => (cond ? it.skip(name, fn as never) : it(name, fn as never)),
	},
);
export const beforeEach = nodeBeforeEach;
export const afterEach = nodeAfterEach;
export const beforeAll = before;
export const afterAll = after;

/** Bun's toEqual ignores properties whose value is undefined; so does this. */
function looseEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return isDeepStrictEqual(a, b);
	if (Array.isArray(a) !== Array.isArray(b)) return false;
	if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
	const keys = (o: object) => Object.keys(o).filter((k) => (o as Record<string, unknown>)[k] !== undefined);
	const ka = keys(a);
	const kb = keys(b);
	if (ka.length !== kb.length) return false;
	return ka.every((k) => looseEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

function subset(actual: unknown, expected: unknown): boolean {
	if (expected === null || typeof expected !== "object") return looseEqual(actual, expected);
	if (actual === null || typeof actual !== "object") return false;
	if (Array.isArray(expected)) {
		return Array.isArray(actual) && actual.length === expected.length && expected.every((e, i) => subset(actual[i], e));
	}
	return Object.entries(expected).every(([k, v]) => subset((actual as Record<string, unknown>)[k], v));
}

function describeValue(v: unknown): string {
	try {
		return typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v) ?? String(v);
	} catch {
		return String(v);
	}
}

type ThrowSpec = string | RegExp | (new (...a: never[]) => Error) | undefined;

function matchesThrow(error: unknown, spec: ThrowSpec): boolean {
	if (spec === undefined) return true;
	const message = error instanceof Error ? error.message : String(error);
	if (typeof spec === "string") return message.includes(spec);
	if (spec instanceof RegExp) return spec.test(message);
	return error instanceof spec;
}

function matchers(actual: unknown, negate: boolean, note?: string) {
	const check = (pass: boolean, what: string) => {
		assert.ok(negate ? !pass : pass, `${note ? `${note}: ` : ""}expected${describeValue(actual)} ${negate ? "not " : ""}${what}`);
	};
	return {
		toBe: (expected: unknown) => check(Object.is(actual, expected), `to be ${describeValue(expected)}`),
		toEqual: (expected: unknown) => check(looseEqual(actual, expected), `to equal ${describeValue(expected)}`),
		toMatchObject: (expected: unknown) => check(subset(actual, expected), `to match object ${describeValue(expected)}`),
		toBeUndefined: () => check(actual === undefined, "to be undefined"),
		toBeDefined: () => check(actual !== undefined, "to be defined"),
		toBeNull: () => check(actual === null, "to be null"),
		toBeInstanceOf: (ctor: new (...a: never[]) => unknown) => check(actual instanceof ctor, `to be an instance of ${ctor.name}`),
		toBeGreaterThan: (n: number) => check((actual as number) > n, `to be greater than ${n}`),
		toBeLessThanOrEqual: (n: number) => check((actual as number) <= n, `to be at most ${n}`),
		toBeCloseTo: (n: number, digits = 2) => check(Math.abs((actual as number) - n) < 10 ** -digits / 2, `to be close to ${n}`),
		toHaveLength: (n: number) => check((actual as { length: number }).length === n, `to have length ${n}`),
		toContain: (item: unknown) =>
			check(
				typeof actual === "string" ? actual.includes(item as string) : Array.from(actual as Iterable<unknown>).some((x) => Object.is(x, item)),
				`to contain ${describeValue(item)}`,
			),
		toMatch: (re: RegExp | string) => check(typeof re === "string" ? (actual as string).includes(re) : re.test(actual as string), `to match ${String(re)}`),
		toHaveProperty: (key: string) => check(actual !== null && typeof actual === "object" && key in (actual as object), `to have property ${key}`),
		toThrow: (spec?: ThrowSpec) => {
			let thrown: unknown;
			let did = false;
			try {
				(actual as () => unknown)();
			} catch (e) {
				did = true;
				thrown = e;
			}
			check(did && matchesThrow(thrown, spec), `to throw${spec ? ` ${String(spec)}` : ""}`);
		},
	};
}

function asyncMatchers(promise: unknown, negate: boolean) {
	return {
		toThrow: async (spec?: ThrowSpec) => {
			let thrown: unknown;
			let did = false;
			try {
				await (typeof promise === "function" ? (promise as () => Promise<unknown>)() : promise);
			} catch (e) {
				did = true;
				thrown = e;
			}
			const pass = did && matchesThrow(thrown, spec);
			assert.ok(negate ? !pass : pass, `expected promise ${negate ? "not " : ""}to reject${spec ? ` with ${String(spec)}` : ""}`);
		},
	};
}

export function expect(actual: unknown, note?: string) {
	return Object.assign(matchers(actual, false, note), {
		not: matchers(actual, true, note),
		rejects: asyncMatchers(actual, false),
		resolves: {
			// `await expect(p).resolves.<matcher>` unwraps the value first.
			get toBe() {
				return async (v: unknown) => matchers(await actual, false).toBe(v);
			},
			get toEqual() {
				return async (v: unknown) => matchers(await actual, false).toEqual(v);
			},
		},
	});
}

expect.unreachable = (message?: string): never => assert.fail(message ?? "unreachable code was reached");
