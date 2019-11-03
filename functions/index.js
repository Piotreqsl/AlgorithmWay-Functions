const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const express = require("express");
const app = express();

app.get("/Posts", (req, res) => {
    admin
        .firestore()
        .collection("Posts")
        .orderBy("createdAt", "desc")
        .get()
        .then(data => {
            let posts = [];
            data.forEach(doc => {
                posts.push({
                    postId: doc.id,
                    Title: doc.data().Title,
                    Desc: doc.data().Desc,
                    createdAt: doc.data().createdAt
                });
            });
            return res.json(posts);
        })
        .catch(err => console.error(err));
});

exports.api = functions.region('europe-west1').https.onRequest(app);

app.post("/Posts", (req, res) => {
    const newAlgorithm = {
        Desc: req.body.Desc,
        Title: req.body.Title,
        createdAt: new Date().toISOString()
    };

    admin
        .firestore()
        .collection("Posts")
        .add(newAlgorithm)
        .then(doc => {
            res.json({
                message: `document ${doc.id} created successfully.`
            });
        })
        .catch(err => {
            res.status(500).json({
                error: "something went wrong"
            });
            console.error(err);
        });
});

exports.api = functions.region('europe-west1').https.onRequest(app);