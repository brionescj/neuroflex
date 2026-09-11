type HighlightMatchProps = {
  text: string;
  query: string;
};

export function HighlightMatch({ text, query }: HighlightMatchProps) {
  const q = query.trim().toLowerCase();

  if (!q) {
    return <>{text}</>;
  }

  const words = text.split(" ");

  return (
    <>
      {words.map((word, index) => {
        const isMatch = word.toLowerCase().startsWith(q);

        return (
          <span key={index}>
            {isMatch ? (
              <>
                <mark className="rounded-sm bg-yellow-400 px-0.5 text-black">
                  {word.slice(0, q.length)}
                </mark>
                {word.slice(q.length)}
              </>
            ) : (
              word
            )}
            {index < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </>
  );
}