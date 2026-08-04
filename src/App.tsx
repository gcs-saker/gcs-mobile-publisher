import { useAuthentication } from "./features/auth/hooks/useAuthentication";
import { usePublisherController } from "./features/publisher/hooks/usePublisherController";
import { AuthenticationScreen } from "./ui/templates/AuthenticationScreen";
import { PublisherScreen } from "./ui/templates/PublisherScreen";

export function App() {
  const authentication = useAuthentication();
  const publisher = usePublisherController(authentication.device);
  if (authentication.status !== "authenticated") {
    return <AuthenticationScreen controller={authentication} />;
  }
  return (
    <PublisherScreen
      controller={publisher}
      principalName={authentication.device?.deviceUuid ?? ""}
      onLogout={authentication.logout}
    />
  );
}
