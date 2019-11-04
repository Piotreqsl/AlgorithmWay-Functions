const functions = require("firebase-functions");


const {
  getAllPosts,
  postOnePost
} = require('./handlers/posts');

const {
  signup,
  login,
  uploadImage
} = require('./handlers/users');

const FBAuth = require('./util/FBAuth');

const app = require("express")();

/// Post routes

app.get("/posts", getAllPosts);
app.post("/post", FBAuth, postOnePost);
// signup
app.post("/signup", signup);
app.post("/login", login);
app.post('/user/image', FBAuth, uploadImage);

exports.api = functions.region("europe-west1").https.onRequest(app);