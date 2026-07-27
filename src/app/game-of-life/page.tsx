import GameOfLifeExperience from "@/app/components/GameOfLifeExperience";
import ControlsDock from "./ControlsDock";
import GameLifePageFlags from "./GameLifePageFlags";

export default function GameOfLifePage() {
  return (
    <>
      <h1 className="sr-only">Conway&apos;s Game of Life</h1>
      <GameLifePageFlags />
      <GameOfLifeExperience />
      <ControlsDock />
    </>
  );
}
