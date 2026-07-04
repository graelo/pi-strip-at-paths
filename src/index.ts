/**
 * strip-at-file-paths — remove the leading `@` from @file references in
 * interactive input, so models don't treat "@" as part of the filename
 * (e.g. trying to launch `@script.sh` and failing).
 *
 * Safety: the `@` is stripped ONLY when the following token resolves to an
 * existing path (relative to cwd, with ~ expansion). Emails, decorators, and
 * scoped npm packages like @earendil-works/pi are left untouched because they
 * don't exist on disk as written.
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// `@token` where @ starts the string or follows whitespace; token is a run of
// non-whitespace path chars, with trailing sentence punctuation kept out of the
// path so "@src/foo.ts." still resolves to "src/foo.ts".
const AT_TOKEN = /(^|\s)@(\S+?)([.,;:!?)\]]*)(?=\s|$)/g;

function expandHome(p: string): string {
	return p === "~" || p.startsWith("~/") ? homedir() + p.slice(1) : p;
}

export default function (pi: ExtensionAPI) {
	pi.on("input", async (event, ctx) => {
		if (event.source === "extension") return { action: "continue" };
		if (!event.text.includes("@")) return { action: "continue" };

		let changed = false;
		const text = event.text.replace(AT_TOKEN, (match, lead: string, path: string, trail: string) => {
			// expandHome is used ONLY for the existsSync check (fs can't stat a
			// literal "~"). The replacement below re-emits the original `path`
			// verbatim, so "~" stays unexpanded and pi resolves it downstream
			// (read tool via resolveReadPath, bash via the shell).
			const candidate = expandHome(path);
			const abs = isAbsolute(candidate) ? candidate : resolve(ctx.cwd, candidate);
			if (existsSync(abs)) {
				changed = true;
				return `${lead}${path}${trail}`; // drop the leading @, keep the path + punctuation
			}
			return match; // not a real path — leave @ intact
		});

		return changed ? { action: "transform", text } : { action: "continue" };
	});
}
