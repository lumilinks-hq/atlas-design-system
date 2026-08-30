import tokens from "../../design/tokens.json";
import rules from "../../design/rules.json";
import pattern from "../../design/patterns/page-layout.json";
import spacingPattern from "../../design/patterns/spacing-layout.json";
import example from "../../design/examples/account-management.json";
import button from "../../design/components/button.json";
import table from "../../design/components/table.json";
import card from "../../design/components/card.json";
import select from "../../design/components/select.json";
import numberField from "../../design/components/number-field.json";
import chip from "../../design/components/chip.json";
import surface from "../../design/components/surface.json";
import drawer from "../../design/components/drawer.json";
import alertDialog from "../../design/components/alert-dialog.json";
import toast from "../../design/components/toast.json";

export const designData = {
  tokens,
  rules: rules.rules,
  pattern,
  spacingPattern,
  example,
  components: [button, table, card, select, numberField, chip, surface, drawer, alertDialog, toast],
};
