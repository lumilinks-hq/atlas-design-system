import tokens from "../../design/tokens.json";
import rules from "../../design/rules.json";
import pattern from "../../design/patterns/page-layout.json";
import spacingPattern from "../../design/patterns/spacing-layout.json";
import visualGroupingPattern from "../../design/patterns/visual-grouping.json";
import mobileLayoutPattern from "../../design/patterns/mobile-layout.json";
import example from "../../design/examples/account-management.json";
import button from "../../design/components/button.json";
import link from "../../design/components/link.json";
import table from "../../design/components/table.json";
import card from "../../design/components/card.json";
import textField from "../../design/components/text-field.json";
import searchField from "../../design/components/search-field.json";
import toolbar from "../../design/components/toolbar.json";
import select from "../../design/components/select.json";
import form from "../../design/components/form.json";
import chip from "../../design/components/chip.json";
import surface from "../../design/components/surface.json";
import drawer from "../../design/components/drawer.json";
import alertDialog from "../../design/components/alert-dialog.json";
import alert from "../../design/components/alert.json";
import toast from "../../design/components/toast.json";
export {
  accountManagementTableUsage,
  createAccountManagementTableCodeExample,
} from "./account-management-table";
export type {
  AccountManagementTableColumn,
  AccountManagementTableColumnId,
  AccountManagementTableUsage,
} from "./account-management-table";

export type PatternVariant = {
  id: string;
  name: string;
  useWhen: string;
  avoidWhen: string;
  structure: string[];
  desktop: string;
  narrow: string;
  layout?: { breakpoint?: string; classes?: string[]; values?: Record<string, string | undefined> };
};

export type PatternDocument = {
  id: string;
  name: string;
  purpose: string;
  principles: { id: string; title: string; description: string }[];
  anatomy: { id: string; name: string; required: boolean; description: string }[];
  variants: PatternVariant[];
  states: string[];
  components: string[];
  rules: string[];
};

export type PatternSlug = "page-layout" | "spacing-layout" | "visual-grouping" | "mobile-layout";

// ルートのslugでパターンを引くための対応表。design/patterns のファイル名と揃える
export const patternsBySlug: Record<PatternSlug, PatternDocument> = {
  "page-layout": pattern,
  "spacing-layout": spacingPattern,
  "visual-grouping": visualGroupingPattern,
  "mobile-layout": mobileLayoutPattern,
};

export const designData = {
  tokens,
  rules: rules.rules,
  pattern,
  spacingPattern,
  patterns: patternsBySlug,
  example,
  components: [button, link, table, toolbar, searchField, card, textField, select, form, chip, surface, drawer, alertDialog, alert, toast],
};
