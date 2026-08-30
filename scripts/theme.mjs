function kebab(value) {
  return value.replaceAll(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function renderTheme(tokens) {
  const baseRadius = tokens.radius.base;
  const declarations = [
    ...Object.entries(tokens.color).map(([key, value]) => [`--dh-${kebab(key)}`, value]),
    ["--accent", tokens.color.accent],
    ["--accent-foreground", tokens.color.surface],
    ["--focus", tokens.color.focus],
    ...Object.entries(tokens.space).map(([key, value]) => [`--dh-space-${key}`, value]),
    ...Object.entries(tokens.radius).map(([key, value]) => [`--dh-radius-${key}`, value]),
    ...Object.entries(tokens.shadow).map(([key, value]) => [`--dh-shadow-${key}`, value]),
    ["--surface-shadow", tokens.shadow.raised],
    ["--overlay-shadow", tokens.shadow.overlay],
    ["--radius", baseRadius],
    ["--field-radius", baseRadius],
    ["--radius-field", baseRadius],
    ...["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"]
      .map((key) => [`--radius-${key}`, baseRadius]),
    ["--dh-content-max", tokens.content.maxWidth],
    ["--dh-reading-width", tokens.content.readingWidth],
    ...Object.entries(tokens.type).map(([key, value]) => [`--dh-type-${kebab(key)}`, value]),
  ];

  return [
    "/* Generated from design/tokens.json. Do not edit by hand. */",
    ":root {",
    ...declarations.map(([name, value]) => `  ${name}: ${value};`),
    "}",
    "",
  ].join("\n");
}
