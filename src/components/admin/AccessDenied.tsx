import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AccessDenied({
  message = "You don't have access to this section.",
}: {
  message?: string;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 text-center border-2 border-foreground space-y-4 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
        <div className="flex justify-center">
          <ShieldOff className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button asChild>
          <Link to="/admin">Back to Dashboard</Link>
        </Button>
      </Card>
    </div>
  );
}
