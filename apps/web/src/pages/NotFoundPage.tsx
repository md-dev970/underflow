import { Link } from "react-router-dom";

import { EmptyState } from "../components/feedback/Feedback";
import { Button } from "../components/forms/Button";

export const NotFoundPage = (): JSX.Element => (
  <main className="container" style={{ paddingBlock: "5rem" }}>
    <EmptyState
      action={
        <Link to="/">
          <Button>Go home</Button>
        </Link>
      }
      description="The page you requested does not exist or is still being wired into the product."
      title="Page not found"
    />
  </main>
);
