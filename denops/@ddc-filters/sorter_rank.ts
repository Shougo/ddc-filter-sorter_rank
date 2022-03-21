import {
  BaseFilter,
  Item,
  DdcOptions,
} from "https://deno.land/x/ddc_vim@v2.2.0/types.ts";
import {
  assertEquals,
  Denops,
  fn,
} from "https://deno.land/x/ddc_vim@v2.2.0/deps.ts";

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

type Params = Record<never, never>;

export class Filter extends BaseFilter<Params> {
  events = ["InsertEnter"] as never[];

  _cache: Record<string, number> = {};

  async onEvent(args: {
    denops: Denops;
    options: DdcOptions;
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
    const pattern = new RegExp(args.options.keywordPattern, "gu");
    for (const line of await fn.getline(args.denops, minLines, maxLines)) {
      for (const match of line.matchAll(pattern)) {
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
    denops: Denops;
    completeStr: string;
    items: Item[];
  }): Promise<Item[]> {
    const linenr = await fn.line(args.denops, ".");

    return Promise.resolve(args.items.sort((a, b) => {
      return calcScore(b.word, args.completeStr, this._cache, linenr) -
        calcScore(a.word, args.completeStr, this._cache, linenr);
    }));
  }

  params(): Params { return {}; }
}

Deno.test("calcScore", () => {
  assertEquals(calcScore("", "", {}, 0), 100);
});
