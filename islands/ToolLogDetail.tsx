import { useEffect, useRef } from "preact/hooks";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import sql from "highlight.js/lib/languages/sql";

hljs.registerLanguage("json", json);
hljs.registerLanguage("sql", sql);

interface ToolLogDetailProps {
  name: string;
  input: unknown;
  result: string;
}

function CodeBlock(
  { code, language }: { code: string; language: string },
) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = code;
      hljs.highlightElement(ref.current);
    }
  }, [code]);

  return (
    <pre class="mt-1 rounded bg-gray-900 p-2 overflow-x-auto">
      <code ref={ref} class={`language-${language} text-xs`} />
    </pre>
  );
}

function formatInput(name: string, input: unknown) {
  if (name === "query_accidents") {
    const { sql: sqlStr, explanation } = input as {
      sql?: string;
      explanation?: string;
    };
    return (
      <>
        {explanation && <p class="text-gray-500 mb-1">{explanation}</p>}
        {sqlStr && <CodeBlock code={sqlStr} language="sql" />}
      </>
    );
  }
  return <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />;
}

function formatResult(result: string) {
  try {
    const parsed = JSON.parse(result);
    return <CodeBlock code={JSON.stringify(parsed, null, 2)} language="json" />;
  } catch {
    return <pre class="mt-1 text-xs whitespace-pre-wrap">{result}</pre>;
  }
}

export default function ToolLogDetail(
  { name, input, result }: ToolLogDetailProps,
) {
  return (
    <div class="hidden group-hover:block absolute left-0 top-full mt-1 z-10 w-[36rem] max-h-80 overflow-auto p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-xs">
      <div class="mb-3">
        <span class="text-gray-400 font-semibold uppercase tracking-wide">
          Input
        </span>
        {formatInput(name, input)}
      </div>
      <div>
        <span class="text-gray-400 font-semibold uppercase tracking-wide">
          Result
        </span>
        {formatResult(result)}
      </div>
    </div>
  );
}
