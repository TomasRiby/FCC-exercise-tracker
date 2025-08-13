const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

let mongoose = require("mongoose");
let bodyParser = require("body-parser");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
});

let UserModel = mongoose.model("User", userSchema);

const exerciseSchema = new mongoose.Schema({
  usernameId: {
    type: String,
    required: true,
  },
  description: String,
  duration: Number,
  date: Date,
});

let ExerciseModel = mongoose.model("Exercise", exerciseSchema);

app.post("/api/users", (req, res) => {
  let userPersistance = new UserModel({ username: req.body.username });
  userPersistance.save((err, data) => {
    if (err) return console.error(err);
    res.json({ username: data.username, _id: data._id });
  });
});

app.get("/api/users", async (req, res) => {
  const collection = await UserModel.find({}, "_id username");
  return res.json(collection);
});

app.get("/api/users/:id/logs", async (req, res) => {
  const user = await UserModel.findById(req.params.id);

  const limit = Number(req.query.limit) || 0;
  const from = req.query.from || new Date(0).toDateString();
  const to = req.query.to || new Date(Date.now()).toDateString();

  if (!user) {
    return res.json({ error: "No user with that id" });
  }

  let exercise = ExerciseModel.find({
    usernameId: user._id,
    date: { $gte: from, $lte: to },
  })
    .select("description duration date")
    .limit(limit);

  exercise.exec((err, exercises) => {
    let parsedDatesLog = exercises.map((exercise) => {
      return {
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString(),
      };
    });
    if (err) return console.error(err);
    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: parsedDatesLog,
    });
  });
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const description = req.body.description;
  const duration = parseInt(req.body.duration);

  let date = req.body.date ? new Date(req.body.date) : new Date();

  let user = await UserModel.findById(req.params._id);

  if (!user) {
    return res.json({ error: "No user with that id" });
  }

  let exercisePersistance = new ExerciseModel({
    usernameId: user._id,
    description: description,
    duration: duration,
    date: date.toDateString(),
  });

  exercisePersistance.save((err, exerciseData) => {
    if (err) return console.error(err);
    res.json({
      _id: user._id,
      username: user.username,
      description: exerciseData.description,
      duration: exerciseData.duration,
      date: new Date(exerciseData.date).toDateString(),
    });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
