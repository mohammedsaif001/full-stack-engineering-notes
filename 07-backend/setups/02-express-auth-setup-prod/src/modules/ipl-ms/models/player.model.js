import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Player name is required"],
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  role: {
    type: String,
    required: [true, "Player role is required"],
    enum: {
      value: ["batsman", "bowler", "all-rounder", "wicket-keeper"],
      message:
        'Role must be: "batsman" , "bowler" , "all-rounder" , "wicket-keeper"',
    },
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: [true, "Team is required"],
  },
},{timestamps:true});


export default mongoose.model("Player" ,playerSchema )