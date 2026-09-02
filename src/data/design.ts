import tokens from "../../design/tokens.json";
import rules from "../../design/rules.json";
import pattern from "../../design/patterns/page-layout.json";
import spacingPattern from "../../design/patterns/spacing-layout.json";
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

export const designData = {
  tokens,
  rules: rules.rules,
  pattern,
  spacingPattern,
  example,
  components: [button, link, table, toolbar, searchField, card, textField, select, form, chip, surface, drawer, alertDialog, alert, toast],
};
