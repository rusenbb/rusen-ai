import GameOfLifeExperience from "@/app/components/GameOfLifeExperience";
import ControlsDock from "./ControlsDock";
import GameLifePageFlags from "./GameLifePageFlags";

export default function GameOfLifePage() {
  return (
    <>
      <GameLifePageFlags />
      <GameOfLifeExperience />
      <ControlsDock />
    </>
  );
}
