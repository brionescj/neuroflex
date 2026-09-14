import { ColorSequenceGame } from "@/features/games/components/ColorSequenceGame";

export default function StudentDashboard() {
  return (
    <div className="flex flex-col items-center gap-3 text-center text-white">
      <ColorSequenceGame />
    </div>
  );
}