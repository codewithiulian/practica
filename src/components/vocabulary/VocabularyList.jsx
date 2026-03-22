import VocabularyCard from "./VocabularyCard";

export default function VocabularyList({ words, onEdit, onRerunAI, onDelete }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {words.map((word) => (
        <VocabularyCard
          key={word.id}
          word={word}
          onEdit={() => onEdit(word)}
          onRerunAI={() => onRerunAI(word)}
          onDelete={() => onDelete(word)}
        />
      ))}
    </div>
  );
}
