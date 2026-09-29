import icon1 from "@/table/assets/icons/card-icon-1.svg?raw";
import icon2 from "@/table/assets/icons/card-icon-2.svg?raw";
import icon3 from "@/table/assets/icons/card-icon-3.svg?raw";
import icon4 from "@/table/assets/icons/card-icon-4.svg?raw";
import icon5 from "@/table/assets/icons/card-icon-5.svg?raw";
import icon6 from "@/table/assets/icons/card-icon-6.svg?raw";
import type { CardId } from "../../../shared/table/types";

const sources: Record<CardId, string> = { question: icon1, anchor: icon2, criterion: icon3, concession: icon4, package: icon5, summary: icon6 };

/** Card icons cut from the mockups; the selected card swaps the two colours as in the design. */
export function CardIcon({ card, inverted, className }: { card: CardId; inverted?: boolean; className?: string }) {
  let markup = sources[card];
  if (inverted) {
    markup = markup
      .replace(/#CDDFF8/gi, "#__LIGHT__")
      .replace(/#544C4C/gi, "#CDDFF8")
      .replace(/#__LIGHT__/g, "#544C4C")
      .replace(/(id="|url\(#)([^"')]+)/g, "$1$2_inv");
  }
  return <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: markup }} />;
}
