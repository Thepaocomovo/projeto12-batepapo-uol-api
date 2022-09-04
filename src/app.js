import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";

const server = express();
server.use(express.json());
server.use(cors());

const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;
mongoClient.connect().then(() => {
	db = mongoClient.db("bate_papo_uol")
});

const time = dayjs(new Date()).format("HH:mm:ss");

const userSchema = joi.object({
  name: joi.string().required()
});
const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().required().valid("message","private_message")
});

server.post("/participants", async (req, res) => {
  const name = req.body;
  const validation = userSchema.validate(name);
  if (validation.error) {
      return res.status(422).send(validation.error.details.map(value => value.message));
    } else{
      const already = await db.collection("users").findOne({"name" : name.name});
      if(!already) {
          try {
              await db.collection("users").insertOne({name: name.name, lastStatus: Date.now()});
              await db.collection("messages").insertOne({from: name.name, to: "Todos", text: "entra na sala...", type: "status", time: time});
              return res.sendStatus(201);
          } catch (error) {
              console.error(error);
              return res.sendStatus(422);
            }
      } else {
          return res.status(409).send("\"Name\" is already registered in DataBase");
      }
    }
});

server.get("/participants", async (req, res) => {
  try {
      const usersList = await db.collection("users").find().toArray();
      return res.send(usersList);
  } catch (error) {
      return res.sendStatus(404);
  }
})

server.post("/messages", async (req, res) => {
  const message = req.body
  const user = req.headers.user;
  
  const validation = messageSchema.validate(message);
  if(validation.error) {
    return res.status(422).send(validation.error.details.map(value => value.message))
  } else{
    if(user !== undefined){
      message.from = user;
    } else {
      return res.status(422).send("\"user\" is required")
    }
    message.time = time;
    try {
      const activeUser = await db.collection("users").findOne({"name" : user});
      if(activeUser) {
        await db.collection("messages").insertOne(message);
        return res.sendStatus(201)
      } else{
        return res.sendStatus(422)
      }
    } catch (error) {
      return res.sendStatus(422)
    }
  }
  
})

server.get("/messages", async (req, res) => {
  let limit = req.query.limit;
  const user = req.headers.user;
  if(limit === undefined) {
    try {
      const fullList = await db.collection("messages").find({ $or: [ { from:  user  }, {to: user}, {to: "Todos"}, {type: "message"} ]}).toArray();
      return res.send(fullList);
    } catch (error) {
      return res.sendStatus(404);
    }
  } else {
    try {
      limit = parseInt(req.query.limit);
      const list = await db.collection("messages").find({ $or: [ { from:  user  }, {to: user}, {to: "Todos"}, {type: "message"}  ]}).toArray();
      const limitedList = list.slice(-limit);
      return res.send(limitedList);
    } catch (error) {
      return res.sendStatus(404);
    }
  }
})

server.post("/status", async (req, res) => {
  
  const user = req.headers.user;
  try {
    const already = await db.collection("users").findOne({"name" : user});
    if(!already) {
      return res.sendStatus(404);  
    }else {
      const finded = await db.collection("users").updateOne({"name" : user}, {$set: { lastStatus: Date.now() }} );
      return res.sendStatus(200);
    }
  } catch (error) {
    return res.sendStatus(422);
  }
})

server.listen (5000, ()=>{console.log("listen on 5000")});