import { Screen, Subtitle, Title } from '../../src/components/ui';
import { PortfolioView } from '../../src/components/PortfolioView';
import { useApp } from '../../src/context/AppContext';

export default function InnovationPortfolioScreen() {
  const { portfolio, project } = useApp();
  // Show unsaved local edits for the open project rather than its last cached copy.
  const entries = portfolio.map((p) => (p.id === project?.id ? project : p));

  return (
    <Screen>
      <Title>Innovation Portfolio</Title>
      <Subtitle>Your complete journey: problems found, ideas tried, failures learned from.</Subtitle>
      {entries.map((p) => (
        <PortfolioView key={p.id} p={p} />
      ))}
      {!entries.length && <Subtitle>No projects yet. Start the Innovation Engine!</Subtitle>}
    </Screen>
  );
}
