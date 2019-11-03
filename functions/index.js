const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const express = require("express");
const app = express();

app.get("/Posts", (req, res) => {
  admin
    .firestore()
    .collection("Posts")
    .get()
    .then(data => {
      let posts = [];
      data.forEach(doc => {
        posts.push(doc.data());
      });
      return res.json(posts);
    })
    .catch(err => console.error(err));
});

exports.api = functions.https.onRequest(app);

//PIOTREK KURWA ZOBACZ TO PANI P NA GOLAJA
