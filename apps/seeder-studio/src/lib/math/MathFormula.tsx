import katex from "katex";

interface Props {
  latex: string;
  display?: boolean;
  className?: string;
}

export function MathFormula({ latex, display = false, className = "" }: Props) {
  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: display,
  });
  return (
    <span
      data-testid="math-formula"
      className={className}
      // Safe: all LaTeX strings are authored in this codebase, never user-supplied.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
