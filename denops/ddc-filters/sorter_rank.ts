import {
  BaseFilter,
  Candidate,
} from "https://deno.land/x/ddc_vim@v0.3.0/types.ts#^";
import { assertEquals, Denops, fn } from "https://deno.land/x/ddc_vim@v0.3.0/deps.ts#^";

function calcScore(
  str: string,
  completeStr: string,
  cache: Record<string, number>,
  linenr: number,
): number {
  let score = 0;
  if (str.indexOf(completeStr) == 0) {
    score += 200;
  } else if (str.toLowerCase().indexOf(completeStr.toLowerCase()) == 0) {
    score += 60;
  } else if (str.toLowerCase().indexOf(completeStr.toLowerCase()) > 0) {
    score += 20;
  }
  score -= str.length * 2;

  if (str in cache) {
    score += LINES_MAX - Math.abs(cache[str] - linenr);
  }

  return score;
}

const LINES_MAX = 150;

export class Filter extends BaseFilter {
  events = ["InsertEnter"] as never[];

  _cache: Record<string, number> = {};

  async onEvent(args: {
    denops: Denops,
  }): Promise<void> {
    const maxSize = LINES_MAX;
    const currentLine = (await args.denops.call("line", ".")) as number;
    const minLines = Math.max(1, currentLine - maxSize);
    const maxLines = Math.min(
      (await fn.line(args.denops, "$")),
      currentLine + maxSize,
    );

    this._cache = {};
    let linenr = minLines;
    for (const line of await fn.getline(args.denops, minLines, maxLines)) {
      for (const match of line.matchAll(/[a-zA-Z0-9_]+/g)) {
        const word = match[0];
        if (
          word in this._cache &&
          Math.abs(this._cache[word] - currentLine) <=
            Math.abs(linenr - currentLine)
        ) {
          continue;
        }
        this._cache[word] = linenr;
      }
      linenr += 1;
    }
  }

  async filter(args: {
    denops: Denops,
    completeStr: string,
    candidates: Candidate[],
  }): Promise<Candidate[]> {
    const linenr = await fn.line(args.denops, ".");

    return Promise.resolve(args.candidates.sort((a, b) => {
      return calcScore(b.word, args.completeStr, this._cache, linenr) -
        calcScore(a.word, args.completeStr, this._cache, linenr);
    }));
  }
}

Deno.test("calcScore", () => {
  assertEquals(calcScore("", "", {}, 0), 100);
});
