import ApiError from "../../../common/utils/api-error.js";
import Team from "../models/team.model.js";
import Player from "../models/player.model.js";

// CREATE , READ , UPDATE , DELETE

const transferPlayer = async (playerId, newTeamId) => {
  const team = await Team.findById(newTeamId);

  if (!team) {
    throw ApiError.notFound("Team not found");
  }

  const player = await Player.findByIdAndUpdate(
    playerId,
    { teamId: newTeamId },
    { new: true, runValidators: true },
  ).populate("teamId" , "name")

  if (!player) {
    throw ApiError.notFound("Player not found");
  }

  return player;
};


const updatePlayerRole = async(playerId , role)=>{
   const player = await Player.findByIdAndUpdate(
    playerId,
    { role },
    { new: true, runValidators: true }
  ).populate("teamId", "name");

   if (!player) {
    throw ApiError.notFound("Player not found");
  }

  return player;
}


export {
    transferPlayer,
    updatePlayerRole
}