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

const date = dayjs(new Date()).format('HH:mm:ss')

const userSchema = joi.object({
    name: joi.string().required()
  });

server.post('/participants', async (req, res) => {
    const name = req.body;
    const validation = userSchema.validate(name);
    if (validation.error) {
        res.status(422).send(validation.error.details.map(value => value.message));
      } else{
        const already = await db.collection("users").findOne({"name" : name.name});
        if(!already) {
            try {
                await db.collection('users').insertOne({name: name.name, lastStatus: Date.now()});
                await db.collection('messages').insertOne({from: name.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: date});
                res.sendStatus(201);
              } catch (error) {
                console.error(error);
                res.sendStatus(422);
              }
        } else {
            res.status(409).send("\"Name\" is already registered in DataBase");
        }
        
      }
  });

  server.get('/participants', async (req, res) => {
    try {
        const usersList = await db.collection("users").find().toArray();
        res.send(usersList)
    } catch (error) {
        res.sendStatus(404)
    }
    
  })

server.listen (5000, ()=>{console.log("listen on 5000")});