const functions = require("firebase-functions");


const {
  getAllPosts,
  postOnePost,
  getPost,
  commentOnPost
} = require('./handlers/posts');

const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserByName
} = require('./handlers/users');

const FBAuth = require('./util/FBAuth');
const moderatorAuth = require('./util/moderatorAuth');

const app = require("express")();

/// Post routes
app.get("/posts", getAllPosts);
//// Get logged user info (do reduxa)
app.get('/user', FBAuth, getAuthenticatedUser);
// Get post by id (w comments);
app.get('/post/:postId', getPost);
//Get user by username
app.get('/users/:username', getUserByName);
//// Add user bio, desc


app.post('/post/:postId/comment', FBAuth, commentOnPost);

app.post("/user", FBAuth, addUserDetails);
app.post("/post", FBAuth, postOnePost);
app.post("/signup", signup);
app.post("/login", login);
/// Upload avatar
app.post('/user/image', FBAuth, uploadImage);
exports.api = functions.region("europe-west1").https.onRequest(app);