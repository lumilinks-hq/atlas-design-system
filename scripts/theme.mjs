function kebab(value) {
  return value.replaceAll(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function renderTheme(tokens) {
  const baseRadius = "var(--dh-radius-base)";
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
    ["--radius", `calc(${baseRadius} / 3)`],
    ["--field-radius", baseRadius],
    ["--radius-field", baseRadius],
    ["--radius-xs", `calc(var(--radius) * .25)`],
    ["--radius-sm", `calc(var(--radius) * .5)`],
    ["--radius-md", `calc(var(--radius) * .75)`],
    ["--radius-lg", "var(--radius)"],
    ["--radius-xl", `calc(var(--radius) * 1.5)`],
    ["--radius-2xl", `calc(var(--radius) * 2)`],
    ["--radius-3xl", `calc(var(--radius) * 3)`],
    ["--radius-4xl", `calc(var(--radius) * 4)`],
    ["--dh-content-max", tokens.content.maxWidth],
    ["--dh-reading-width", tokens.content.readingWidth],
    ...Object.entries(tokens.breakpoint ?? {}).map(([key, value]) => [`--dh-breakpoint-${kebab(key)}`, value]),
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

export function findStaleThemeFiles(theme, files) {
  return files.filter((file) => file.content !== theme).map((file) => file.path);
}
