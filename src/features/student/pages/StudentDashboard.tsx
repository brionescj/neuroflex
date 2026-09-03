import { ColorSequenceGame } from "@/features/games/components/ColorSequenceGame";

export default function StudentDashboard() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center text-white sm:gap-4 sm:py-8 md:gap-6 md:py-12">
      <ColorSequenceGame />
    </div>
  );
}