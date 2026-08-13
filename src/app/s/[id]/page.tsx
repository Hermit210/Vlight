import { CameraApp } from "@/components/camera/CameraApp";

export default async function SharedSession({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CameraApp sessionId={id} />;
}
