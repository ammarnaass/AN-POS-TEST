import React from 'react';
import { splitTextForHighlight } from '../services/supportFilterService';

interface SupportHighlightTextProps {
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
}

export const SupportHighlightText: React.FC<SupportHighlightTextProps> = ({
  text,
  query,
  className = '',
  highlightClassName = 'bg-amber-200 text-amber-950 dark:bg-amber-500/30 dark:text-amber-200 font-bold px-1 rounded',
}) => {
  const chunks = splitTextForHighlight(text, query);

  return (
    <span className={className}>
      {chunks.map((chunk, index) =>
        chunk.isMatch ? (
          <span key={index} className={highlightClassName}>
            {chunk.text}
          </span>
        ) : (
          <React.Fragment key={index}>{chunk.text}</React.Fragment>
        )
      )}
    </span>
  );
};
