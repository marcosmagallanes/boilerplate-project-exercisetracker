const express = require('express')
const app = express()
const cors = require('cors')
const mongo = require('mongodb')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const { nanoid } = require('nanoid')
const moment = require("moment");
require('dotenv').config()

// Basic Config
app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Mongo Connect

const uri = process.env.MONGO_URI;
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
});
const connection = mongoose.connection;
connection.on("error", console.error.bind(console, "connection error"));
connection.once("open", () => {
  console.log("database connection established");
});

// Mongoose Schema

const Schema = mongoose.Schema;

const exerciseSchema = new Schema({
  description: String,
  duration: Number,
  date: String,
});

const Exercise = mongoose.model('Exercise', exerciseSchema)

const userSchema = new Schema({
  username: String,
  _id: String,
  log: [exerciseSchema]
});

const User = mongoose.model("User", userSchema);

app.use(({ method, url, query, params, body }, res, next) => {
  console.log(">>> ", method, url);
  console.log(" QUERY:", query);
  console.log(" PRAMS:", params);
  console.log("  BODY:", body);
  const _json = res.json;
  res.json = function (data) {
    console.log(" RESLT:", JSON.stringify(data, null, 2));
    return _json.call(this, data);
  };
  console.log(" ----------------------------");
  next();
});

// 
// 
// API calls
// 
// 

app.post('/api/users', async (req, res) => {
  console.log('@@@@@@@@@@@@@@@@@@@@')
  console.log("POST /api/users");
  const reqUsername = req.body.username;
  const existingUser = await User.findOne({ username: reqUsername });

  if (existingUser) {
    res.json({ error: "A user with that name already exists" });
  } else {

    const newUser = new User({
      username: reqUsername,
      _id: nanoid(6),
    })

    newUser.save((err, saved) => {
      if (err) console.error(err)
      res.json(saved)
    })

  }
})

app.get("/api/users", async (req, res) => {
  console.log('GET /api/users')
  const arrayOfAllUsers = await User.find();
  res.json(arrayOfAllUsers);
});

// Add Exercise

app.post('/api/users/:_id/exercises', async(req, res) => {
  console.log("####################");
  console.log("POST /api/users/:_id/exercises");
  console.log(req.params._id);
  console.log(req.body.description);
  console.log(req.body.duration);
  console.log(req.body.date);
  
  const reqID = req.params._id
  const reqDescription = req.body.description
  const reqDuration = req.body.duration
  let reqDate = req.body.date

  if (moment(reqDate, "YYYY-MM-DD", true).isValid()) {
    reqDate = moment(req.body.date).format("ddd MMM DD YYYY");
  } else {
    reqDate = moment().format("ddd MMM DD YYYY");
  }

  console.log(`reqID: ${reqID}`);
  console.log(`reqDescription: ${reqDescription}`);
  console.log(`reqDuration: ${reqDuration}`);
  console.log(`reqDate: ${reqDate}`);

  const pushObject = {
    description: reqDescription,
    duration: parseInt(reqDuration),
    date: reqDate,
  }

  User.findByIdAndUpdate(reqID,
    { $push: { log: pushObject } },
    { new: true },
    (err, newUserByID) => {
      if (err) {
        return console.error(err)
      }

      const resObject = {
        username: newUserByID.username,
        description: reqDescription,
        duration: parseInt(reqDuration),
        _id: reqID,
        date: reqDate,
      }

      console.log('resObj:', resObject)

      res.json(resObject)
    }
  )
})

app.get('/api/users/:_id/logs', async(req, res) => {
  console.log(req.params._id);
  console.log(req.query.from);
  console.log(req.query.to);
  console.log(req.query.limit);

  const reqID = req.params._id;

  const reqFrom = moment(req.query.from, 'YYYY-MM-DD', true).isValid()
  ? moment(req.query.from)
  : moment(0)

  const reqTo = moment(req.query.to, 'YYYY-MM-DD', true).isValid()
  ? moment(req.query.to)
  : moment()

  const reqLimit = req.query.limit;

  console.log(reqID);
  console.log(reqFrom);
  console.log(reqTo);
  console.log(reqLimit);

  const existingUser = await User.findById(reqID);

  if (!existingUser) {
    res.json({ error: `A user with than ID doesn't exist!` });
  } else {
    let filteredLog = existingUser.log
      .filter((item) =>
        moment(item.date).isBetween(reqFrom, reqTo, undefined, [])
      )
      .slice(0, reqLimit);

    console.log(existingUser.log);
    console.log(filteredLog);

    const resObj = {
      username: existingUser.username,
      count: filteredLog.length,
      _id: existingUser._id,
      log: filteredLog,
    };

    console.log(`********************`);
    console.log(`resObj: `, resObj)

    res.json(resObj);
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
