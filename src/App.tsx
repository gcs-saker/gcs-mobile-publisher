import { usePublisherController } from "./features/publisher/hooks/usePublisherController";
import { PublisherScreen } from "./ui/templates/PublisherScreen";

export function App() {
  const controller = usePublisherController();
  return <PublisherScreen controller={controller} />;
}
