import type { DdcOptions, Item } from "@shougo/ddc-vim/types";
import { BaseFilter } from "@shougo/ddc-vim/filter";
import { convertKeywordPattern } from "@shougo/ddc-vim/utils";

import type { Denops } from "@denops/std";
import * as fn from "@denops/std/function";

import { assertEquals } from "@std/assert/equals";

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
const COLUMNS_MAX = 150;

type Params = Record<string, never>;

export class Filter extends BaseFilter<Params> {
  override events = ["InsertEnter"] as never[];

  _cache: Record<string, number> = {};

  override async onEvent(args: {
    denops: Denops;
    options: DdcOptions;
  }): Promise<void> {
    const maxSize = LINES_MAX;
    const currentLine = (await args.denops.call("line", ".")) as number;
    const minLines = Math.max(1, currentLine - maxSize);
    const maxLines = Math.min(
      await fn.line(args.denops, "$"),
      currentLine + maxSize,
    );

    // Convert keywordPattern
    const keywordPattern = await convertKeywordPattern(
      args.denops,
      "\\k*",
    );

    this._cache = {};
    let linenr = minLines;
    const pattern = new RegExp(keywordPattern, "gu");
    for (const line of await fn.getline(args.denops, minLines, maxLines)) {
      if (line.length > COLUMNS_MAX) {
        // Skip too long lines
        continue;
      }

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

  override async filter(args: {
    denops: Denops;
    completeStr: string;
    items: Item[];
  }): Promise<Item[]> {
    if (args.completeStr.length === 0) {
      return args.items;
    }

    const linenr = await fn.line(args.denops, ".");

    const scores: Record<string, number> = {};
    for (const item of args.items) {
      scores[item.word] = calcScore(
        item.word,
        args.completeStr,
        this._cache,
        linenr,
      );
    }

    return Promise.resolve(
      args.items.sort((a, b) => scores[b.word] - scores[a.word]),
    );
  }

  override params(): Params {
    return {};
  }
}

Deno.test("calcScore", () => {
  assertEquals(calcScore("", "", {}, 0), 100);
});
